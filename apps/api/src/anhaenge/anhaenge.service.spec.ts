import {
  NotFoundException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from "@nestjs/common";
import { ANHANG_MAX_GROESSE_BYTES, Rolle, type AuthenticatedUser } from "@schichtbuch/shared";
import { AnhaengeService, type UploadedFileLike } from "./anhaenge.service";

function makeUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: "user-1",
    username: "u",
    email: "u@example.com",
    name: "User",
    rollen: [Rolle.INSTANDHALTER],
    permissions: [],
    gewerkeSichtbarkeit: [],
    ...overrides,
  };
}

function makePrisma(eintragVisible = true) {
  return {
    schichtbucheintrag: {
      findFirst: jest.fn().mockResolvedValue(eintragVisible ? { id: "e1" } : null),
    },
    anhang: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  };
}

function makeStorage() {
  return {
    putObject: jest.fn().mockResolvedValue(undefined),
    getObjectStream: jest.fn(),
    removeObject: jest.fn().mockResolvedValue(undefined),
  };
}

function makeVirusScan() {
  return { scan: jest.fn().mockResolvedValue(undefined) };
}

function makeFile(overrides: Partial<UploadedFileLike> = {}): UploadedFileLike {
  return {
    originalname: "bild.png",
    mimetype: "image/png",
    size: 1024,
    buffer: Buffer.from("x"),
    ...overrides,
  };
}

const CREATED = {
  id: "a1",
  eintragId: "e1",
  dateiname: "bild.png",
  mime: "image/png",
  groesse: 1024,
  objectKey: "eintraege/e1/uuid.png",
  createdAt: new Date(),
  updatedAt: new Date(),
  hochgeladenVon: { id: "user-1", name: "User" },
};

describe("AnhaengeService – Sichtbarkeit", () => {
  it("list wirft 404, wenn der Eintrag nicht sichtbar ist", async () => {
    const prisma = makePrisma(false);
    const service = new AnhaengeService(
      prisma as never,
      makeStorage() as never,
      makeVirusScan() as never,
    );
    await expect(service.list(makeUser(), "e1")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("list filtert Eintrag auf zugewiesene Gewerke", async () => {
    const prisma = makePrisma();
    const service = new AnhaengeService(
      prisma as never,
      makeStorage() as never,
      makeVirusScan() as never,
    );
    await service.list(makeUser({ gewerkeSichtbarkeit: ["Mechanik"] }), "e1");
    const where = prisma.schichtbucheintrag.findFirst.mock.calls[0][0].where;
    expect(where.gewerk).toEqual({ name: { in: ["Mechanik"] } });
  });
});

describe("AnhaengeService – Upload-Validierung", () => {
  it("lehnt nicht erlaubte MIME-Typen ab (415)", async () => {
    const prisma = makePrisma();
    const service = new AnhaengeService(
      prisma as never,
      makeStorage() as never,
      makeVirusScan() as never,
    );
    await expect(
      service.upload(makeUser(), "e1", makeFile({ mimetype: "application/x-msdownload" })),
    ).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
  });

  it("lehnt zu große Dateien ab (413)", async () => {
    const prisma = makePrisma();
    const service = new AnhaengeService(
      prisma as never,
      makeStorage() as never,
      makeVirusScan() as never,
    );
    await expect(
      service.upload(makeUser(), "e1", makeFile({ size: ANHANG_MAX_GROESSE_BYTES + 1 })),
    ).rejects.toBeInstanceOf(PayloadTooLargeException);
  });

  it("legt Objekt in MinIO ab und persistiert Metadaten", async () => {
    const prisma = makePrisma();
    prisma.anhang.create.mockResolvedValue(CREATED);
    const storage = makeStorage();
    const virusScan = makeVirusScan();
    const service = new AnhaengeService(prisma as never, storage as never, virusScan as never);

    const result = await service.upload(makeUser(), "e1", makeFile());

    expect(virusScan.scan).toHaveBeenCalled();
    expect(storage.putObject).toHaveBeenCalledTimes(1);
    expect(prisma.anhang.create).toHaveBeenCalledTimes(1);
    expect(result.id).toBe("a1");
    expect(result.dateiname).toBe("bild.png");
  });

  it("räumt verwaistes Objekt auf, wenn die DB-Persistenz fehlschlägt", async () => {
    const prisma = makePrisma();
    prisma.anhang.create.mockRejectedValue(new Error("db down"));
    const storage = makeStorage();
    const service = new AnhaengeService(
      prisma as never,
      storage as never,
      makeVirusScan() as never,
    );

    await expect(service.upload(makeUser(), "e1", makeFile())).rejects.toThrow("db down");
    expect(storage.removeObject).toHaveBeenCalledTimes(1);
  });
});

describe("AnhaengeService – Löschen", () => {
  it("entfernt DB-Datensatz und MinIO-Objekt", async () => {
    const prisma = makePrisma();
    prisma.anhang.findFirst.mockResolvedValue(CREATED);
    prisma.anhang.delete.mockResolvedValue(CREATED);
    const storage = makeStorage();
    const service = new AnhaengeService(
      prisma as never,
      storage as never,
      makeVirusScan() as never,
    );

    await service.remove(makeUser(), "e1", "a1");

    expect(prisma.anhang.delete).toHaveBeenCalledWith({ where: { id: "a1" } });
    expect(storage.removeObject).toHaveBeenCalledWith("eintraege/e1/uuid.png");
  });

  it("wirft 404, wenn der Anhang nicht zum Eintrag gehört", async () => {
    const prisma = makePrisma();
    prisma.anhang.findFirst.mockResolvedValue(null);
    const service = new AnhaengeService(
      prisma as never,
      makeStorage() as never,
      makeVirusScan() as never,
    );
    await expect(service.remove(makeUser(), "e1", "a1")).rejects.toBeInstanceOf(NotFoundException);
  });
});
