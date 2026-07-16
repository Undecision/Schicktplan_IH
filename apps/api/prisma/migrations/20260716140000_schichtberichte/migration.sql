-- CreateEnum
CREATE TYPE "SchichtberichtStatus" AS ENUM ('ENTWURF', 'FREIGEGEBEN');

-- CreateTable
CREATE TABLE "schichtberichte" (
    "id" UUID NOT NULL,
    "datum" DATE NOT NULL,
    "schichtId" UUID NOT NULL,
    "gewerkId" UUID NOT NULL,
    "verantwortlicherId" UUID,
    "status" "SchichtberichtStatus" NOT NULL DEFAULT 'ENTWURF',
    "besondereEreignisse" TEXT,
    "freigegebenVonId" UUID,
    "freigegebenAm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schichtberichte_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "schichtberichte_datum_idx" ON "schichtberichte"("datum");

-- CreateIndex
CREATE UNIQUE INDEX "schichtberichte_datum_schichtId_gewerkId_key" ON "schichtberichte"("datum", "schichtId", "gewerkId");

-- AddForeignKey
ALTER TABLE "schichtberichte" ADD CONSTRAINT "schichtberichte_schichtId_fkey" FOREIGN KEY ("schichtId") REFERENCES "schicht_definitionen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schichtberichte" ADD CONSTRAINT "schichtberichte_gewerkId_fkey" FOREIGN KEY ("gewerkId") REFERENCES "gewerke"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schichtberichte" ADD CONSTRAINT "schichtberichte_verantwortlicherId_fkey" FOREIGN KEY ("verantwortlicherId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schichtberichte" ADD CONSTRAINT "schichtberichte_freigegebenVonId_fkey" FOREIGN KEY ("freigegebenVonId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
