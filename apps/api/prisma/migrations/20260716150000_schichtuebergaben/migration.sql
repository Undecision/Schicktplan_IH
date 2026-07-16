-- CreateEnum
CREATE TYPE "UebergabeStatus" AS ENUM ('ENTWURF', 'UEBERGEBEN');

-- CreateTable
CREATE TABLE "schichtuebergaben" (
    "id" UUID NOT NULL,
    "datum" DATE NOT NULL,
    "schichtId" UUID NOT NULL,
    "gewerkId" UUID NOT NULL,
    "status" "UebergabeStatus" NOT NULL DEFAULT 'ENTWURF',
    "besondereHinweise" TEXT,
    "sicherheitshinweise" TEXT,
    "freischaltungen" TEXT,
    "arbeitsgenehmigungen" TEXT,
    "wichtigeTermine" TEXT,
    "uebergebenVonId" UUID,
    "uebernommenVonId" UUID,
    "uebergebenAm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schichtuebergaben_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "schichtuebergaben_datum_idx" ON "schichtuebergaben"("datum");

-- CreateIndex
CREATE UNIQUE INDEX "schichtuebergaben_datum_schichtId_gewerkId_key" ON "schichtuebergaben"("datum", "schichtId", "gewerkId");

-- AddForeignKey
ALTER TABLE "schichtuebergaben" ADD CONSTRAINT "schichtuebergaben_schichtId_fkey" FOREIGN KEY ("schichtId") REFERENCES "schicht_definitionen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schichtuebergaben" ADD CONSTRAINT "schichtuebergaben_gewerkId_fkey" FOREIGN KEY ("gewerkId") REFERENCES "gewerke"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schichtuebergaben" ADD CONSTRAINT "schichtuebergaben_uebergebenVonId_fkey" FOREIGN KEY ("uebergebenVonId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schichtuebergaben" ADD CONSTRAINT "schichtuebergaben_uebernommenVonId_fkey" FOREIGN KEY ("uebernommenVonId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
