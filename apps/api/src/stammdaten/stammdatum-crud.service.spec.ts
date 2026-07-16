import { ConflictException, NotFoundException } from "@nestjs/common";
import {
  PrismaDelegateLike,
  StammdatumCrudConfig,
  StammdatumCrudService,
} from "./stammdatum-crud.service";

interface TestModel {
  id: string;
  name: string;
  aktiv: boolean;
  deletedAt: Date | null;
}

class TestService extends StammdatumCrudService<TestModel> {
  protected readonly config: StammdatumCrudConfig = {
    entityName: "Test",
    uniqueField: "name",
    orderBy: "name",
  };
  constructor(protected readonly delegate: PrismaDelegateLike<TestModel>) {
    super();
  }
  create(name: string) {
    return this.createRecord({ name });
  }
  update(id: string, data: Record<string, unknown>) {
    return this.updateRecord(id, data);
  }
}

function makeDelegate(overrides: Partial<PrismaDelegateLike<TestModel>> = {}) {
  return {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue(null),
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({ id: "1", name: "x", aktiv: true, deletedAt: null }),
    update: jest.fn().mockResolvedValue({ id: "1", name: "x", aktiv: true, deletedAt: null }),
    ...overrides,
  } satisfies PrismaDelegateLike<TestModel>;
}

describe("StammdatumCrudService", () => {
  it("list(): filtert standardmäßig auf aktiv=true und deletedAt=null", async () => {
    const delegate = makeDelegate();
    await new TestService(delegate).list();
    expect(delegate.findMany).toHaveBeenCalledWith({
      where: { deletedAt: null, aktiv: true },
      orderBy: { name: "asc" },
    });
  });

  it("list(true): schließt inaktive ein", async () => {
    const delegate = makeDelegate();
    await new TestService(delegate).list(true);
    expect(delegate.findMany).toHaveBeenCalledWith({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    });
  });

  it("create(): wirft ConflictException bei Duplikat", async () => {
    const delegate = makeDelegate({
      findFirst: jest
        .fn()
        .mockResolvedValue({ id: "other", name: "x", aktiv: true, deletedAt: null }),
    });
    await expect(new TestService(delegate).create("x")).rejects.toBeInstanceOf(ConflictException);
    expect(delegate.create).not.toHaveBeenCalled();
  });

  it("create(): legt an, wenn kein Duplikat existiert", async () => {
    const delegate = makeDelegate();
    await new TestService(delegate).create("neu");
    expect(delegate.create).toHaveBeenCalledWith({ data: { name: "neu" } });
  });

  it("update(): wirft NotFoundException, wenn Eintrag fehlt", async () => {
    const delegate = makeDelegate({ findUnique: jest.fn().mockResolvedValue(null) });
    await expect(
      new TestService(delegate).update("missing", { aktiv: false }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("update(): erlaubt gleichen Namen für denselben Datensatz (kein Selbst-Duplikat)", async () => {
    const record = { id: "1", name: "x", aktiv: true, deletedAt: null };
    const delegate = makeDelegate({
      findUnique: jest.fn().mockResolvedValue(record),
      findFirst: jest.fn().mockResolvedValue(record),
    });
    await new TestService(delegate).update("1", { name: "x" });
    expect(delegate.update).toHaveBeenCalledWith({ where: { id: "1" }, data: { name: "x" } });
  });
});
