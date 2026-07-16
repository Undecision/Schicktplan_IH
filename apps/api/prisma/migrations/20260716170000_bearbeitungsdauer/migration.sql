-- Bearbeitungsdauer: Beginn/Ende der tatsächlichen Bearbeitung eines Eintrags.
-- AlterTable
ALTER TABLE "schichtbucheintraege"
  ADD COLUMN "bearbeitungBeginn" TIMESTAMP(3),
  ADD COLUMN "bearbeitungEnde" TIMESTAMP(3);
