-- Arbeitsanweisungen: Meister-Hinweise mit Freitext und/oder Anhang, quittierbar.

-- CreateTable
CREATE TABLE "arbeitsanweisungen" (
    "id" UUID NOT NULL,
    "titel" TEXT NOT NULL,
    "text" TEXT,
    "gewerkId" UUID NOT NULL,
    "schichtId" UUID,
    "erstellerId" UUID NOT NULL,
    "anhangObjectKey" TEXT,
    "anhangDateiname" TEXT,
    "anhangMime" TEXT,
    "anhangGroesse" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "arbeitsanweisungen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arbeitsanweisung_quittungen" (
    "id" UUID NOT NULL,
    "arbeitsanweisungId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "gelesenAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "arbeitsanweisung_quittungen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "arbeitsanweisungen_gewerkId_idx" ON "arbeitsanweisungen"("gewerkId");
CREATE INDEX "arbeitsanweisungen_erstellerId_idx" ON "arbeitsanweisungen"("erstellerId");
CREATE INDEX "arbeitsanweisung_quittungen_userId_idx" ON "arbeitsanweisung_quittungen"("userId");
CREATE UNIQUE INDEX "arbeitsanweisung_quittungen_arbeitsanweisungId_userId_key" ON "arbeitsanweisung_quittungen"("arbeitsanweisungId", "userId");

-- AddForeignKey
ALTER TABLE "arbeitsanweisungen" ADD CONSTRAINT "arbeitsanweisungen_gewerkId_fkey" FOREIGN KEY ("gewerkId") REFERENCES "gewerke"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "arbeitsanweisungen" ADD CONSTRAINT "arbeitsanweisungen_schichtId_fkey" FOREIGN KEY ("schichtId") REFERENCES "schicht_definitionen"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "arbeitsanweisungen" ADD CONSTRAINT "arbeitsanweisungen_erstellerId_fkey" FOREIGN KEY ("erstellerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "arbeitsanweisung_quittungen" ADD CONSTRAINT "arbeitsanweisung_quittungen_arbeitsanweisungId_fkey" FOREIGN KEY ("arbeitsanweisungId") REFERENCES "arbeitsanweisungen"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "arbeitsanweisung_quittungen" ADD CONSTRAINT "arbeitsanweisung_quittungen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
