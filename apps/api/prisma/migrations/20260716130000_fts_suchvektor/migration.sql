-- Volltextsuche (P5.1): generierte tsvector-Spalte + GIN-Index.
-- beschreibung erhält das höchste Gewicht (A), die Referenzfelder SAP-IH-Auftrag
-- und EasyFlow-TAG Gewicht B. Die deutsche Text-Search-Konfiguration sorgt für
-- Stemming (z.B. "Störungen" ~ "Störung").
ALTER TABLE "schichtbucheintraege"
  ADD COLUMN "suchVektor" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('german', coalesce("beschreibung", '')), 'A') ||
    setweight(to_tsvector('german', coalesce("sapIhAuftrag", '')), 'B') ||
    setweight(to_tsvector('german', coalesce("easyFlowTag", '')), 'B')
  ) STORED;

-- CreateIndex
CREATE INDEX "schichtbucheintraege_suchVektor_idx" ON "schichtbucheintraege" USING GIN ("suchVektor");
