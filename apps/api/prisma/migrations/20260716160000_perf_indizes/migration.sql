-- Performance-Indizes (P11.1) für häufige Filter-/Report-Zugriffe.
-- CreateIndex
CREATE INDEX "schichtbucheintraege_fachbereichId_idx" ON "schichtbucheintraege"("fachbereichId");

-- CreateIndex
CREATE INDEX "schichtbucheintraege_technischerPlatzId_idx" ON "schichtbucheintraege"("technischerPlatzId");

-- CreateIndex
CREATE INDEX "schichtbucheintraege_erstellerId_idx" ON "schichtbucheintraege"("erstellerId");
