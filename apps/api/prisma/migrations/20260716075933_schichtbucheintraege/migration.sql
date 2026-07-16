-- CreateEnum
CREATE TYPE "Prioritaet" AS ENUM ('NIEDRIG', 'NORMAL', 'HOCH', 'KRITISCH');

-- CreateEnum
CREATE TYPE "EintragStatus" AS ENUM ('OFFEN', 'IN_BEARBEITUNG', 'ERLEDIGT', 'VERSCHOBEN');

-- CreateTable
CREATE TABLE "schichtbucheintraege" (
    "id" UUID NOT NULL,
    "zeitpunkt" TIMESTAMP(3) NOT NULL,
    "prioritaet" "Prioritaet" NOT NULL DEFAULT 'NORMAL',
    "status" "EintragStatus" NOT NULL DEFAULT 'OFFEN',
    "beschreibung" TEXT NOT NULL,
    "sapIhAuftrag" TEXT,
    "easyFlowTag" TEXT,
    "faelligkeitsdatum" TIMESTAMP(3),
    "schichtId" UUID NOT NULL,
    "gewerkId" UUID NOT NULL,
    "fachbereichId" UUID NOT NULL,
    "technischerPlatzId" UUID NOT NULL,
    "erstellerId" UUID NOT NULL,
    "verantwortlicherId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "schichtbucheintraege_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eintrag_kommentare" (
    "id" UUID NOT NULL,
    "eintragId" UUID NOT NULL,
    "autorId" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eintrag_kommentare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_EintragSchlagwoerter" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_EintragSchlagwoerter_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "schichtbucheintraege_gewerkId_idx" ON "schichtbucheintraege"("gewerkId");

-- CreateIndex
CREATE INDEX "schichtbucheintraege_status_idx" ON "schichtbucheintraege"("status");

-- CreateIndex
CREATE INDEX "schichtbucheintraege_prioritaet_idx" ON "schichtbucheintraege"("prioritaet");

-- CreateIndex
CREATE INDEX "schichtbucheintraege_zeitpunkt_idx" ON "schichtbucheintraege"("zeitpunkt");

-- CreateIndex
CREATE INDEX "eintrag_kommentare_eintragId_idx" ON "eintrag_kommentare"("eintragId");

-- CreateIndex
CREATE INDEX "_EintragSchlagwoerter_B_index" ON "_EintragSchlagwoerter"("B");

-- AddForeignKey
ALTER TABLE "schichtbucheintraege" ADD CONSTRAINT "schichtbucheintraege_schichtId_fkey" FOREIGN KEY ("schichtId") REFERENCES "schicht_definitionen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schichtbucheintraege" ADD CONSTRAINT "schichtbucheintraege_gewerkId_fkey" FOREIGN KEY ("gewerkId") REFERENCES "gewerke"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schichtbucheintraege" ADD CONSTRAINT "schichtbucheintraege_fachbereichId_fkey" FOREIGN KEY ("fachbereichId") REFERENCES "fachbereiche"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schichtbucheintraege" ADD CONSTRAINT "schichtbucheintraege_technischerPlatzId_fkey" FOREIGN KEY ("technischerPlatzId") REFERENCES "technische_plaetze"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schichtbucheintraege" ADD CONSTRAINT "schichtbucheintraege_erstellerId_fkey" FOREIGN KEY ("erstellerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schichtbucheintraege" ADD CONSTRAINT "schichtbucheintraege_verantwortlicherId_fkey" FOREIGN KEY ("verantwortlicherId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eintrag_kommentare" ADD CONSTRAINT "eintrag_kommentare_eintragId_fkey" FOREIGN KEY ("eintragId") REFERENCES "schichtbucheintraege"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eintrag_kommentare" ADD CONSTRAINT "eintrag_kommentare_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EintragSchlagwoerter" ADD CONSTRAINT "_EintragSchlagwoerter_A_fkey" FOREIGN KEY ("A") REFERENCES "schichtbucheintraege"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EintragSchlagwoerter" ADD CONSTRAINT "_EintragSchlagwoerter_B_fkey" FOREIGN KEY ("B") REFERENCES "schlagwoerter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
