-- AlterTable
ALTER TABLE "gewerke" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "fachbereiche" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "fachbereiche_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technische_plaetze" (
    "id" UUID NOT NULL,
    "bezeichnung" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "sapSyncFaehig" BOOLEAN NOT NULL DEFAULT false,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "technische_plaetze_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schlagwoerter" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "schlagwoerter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schicht_definitionen" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "startzeit" TEXT NOT NULL,
    "endzeit" TEXT NOT NULL,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "schicht_definitionen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fachbereiche_name_key" ON "fachbereiche"("name");

-- CreateIndex
CREATE UNIQUE INDEX "technische_plaetze_code_key" ON "technische_plaetze"("code");

-- CreateIndex
CREATE UNIQUE INDEX "schlagwoerter_name_key" ON "schlagwoerter"("name");

-- CreateIndex
CREATE UNIQUE INDEX "schicht_definitionen_name_key" ON "schicht_definitionen"("name");
