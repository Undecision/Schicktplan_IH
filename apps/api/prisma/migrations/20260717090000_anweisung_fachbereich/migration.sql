-- Optionaler Fachbereich für Arbeitsanweisungen (filter-/durchsuchbar).
ALTER TABLE "arbeitsanweisungen" ADD COLUMN "fachbereichId" UUID;

CREATE INDEX "arbeitsanweisungen_fachbereichId_idx" ON "arbeitsanweisungen"("fachbereichId");

ALTER TABLE "arbeitsanweisungen"
  ADD CONSTRAINT "arbeitsanweisungen_fachbereichId_fkey"
  FOREIGN KEY ("fachbereichId") REFERENCES "fachbereiche"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
