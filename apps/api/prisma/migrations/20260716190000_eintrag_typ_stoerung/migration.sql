-- Zwei Eintragstypen (Schichtinformation / Störung) mit strukturierten Feldern.
-- CreateEnum
CREATE TYPE "EintragTyp" AS ENUM ('SCHICHTINFORMATION', 'STOERUNG');

-- AlterTable
ALTER TABLE "schichtbucheintraege"
  ADD COLUMN "typ" "EintragTyp" NOT NULL DEFAULT 'SCHICHTINFORMATION',
  ADD COLUMN "stoerung" TEXT,
  ADD COLUMN "ursache" TEXT,
  ADD COLUMN "korrekturmassnahme" TEXT;

-- Volltextsuche neu aufbauen: zusätzlich Ursache + Korrekturmaßnahme indexieren.
DROP INDEX "schichtbucheintraege_suchVektor_idx";
ALTER TABLE "schichtbucheintraege" DROP COLUMN "suchVektor";
ALTER TABLE "schichtbucheintraege"
  ADD COLUMN "suchVektor" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('german', coalesce("beschreibung", '')), 'A') ||
    setweight(to_tsvector('german', coalesce("ursache", '')), 'B') ||
    setweight(to_tsvector('german', coalesce("korrekturmassnahme", '')), 'B') ||
    setweight(to_tsvector('german', coalesce("sapIhAuftrag", '')), 'B') ||
    setweight(to_tsvector('german', coalesce("easyFlowTag", '')), 'B')
  ) STORED;
CREATE INDEX "schichtbucheintraege_suchVektor_idx" ON "schichtbucheintraege" USING GIN ("suchVektor");
