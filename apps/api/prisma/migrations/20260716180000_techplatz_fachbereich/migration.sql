-- Optionale Fachbereich-Zuordnung für technische Plätze (Vorbelegung im Formular).
-- AlterTable
ALTER TABLE "technische_plaetze" ADD COLUMN "fachbereichId" UUID;

-- CreateIndex
CREATE INDEX "technische_plaetze_fachbereichId_idx" ON "technische_plaetze"("fachbereichId");

-- AddForeignKey
ALTER TABLE "technische_plaetze" ADD CONSTRAINT "technische_plaetze_fachbereichId_fkey" FOREIGN KEY ("fachbereichId") REFERENCES "fachbereiche"("id") ON DELETE SET NULL ON UPDATE CASCADE;
