-- Schichtübergreifende Weitergabe an die Folgeschicht (Markierung bis Erledigung).
ALTER TABLE "schichtbucheintraege"
  ADD COLUMN "weitergegeben" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "weitergegebenAm" TIMESTAMP(3);
