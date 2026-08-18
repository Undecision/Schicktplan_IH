-- Globale App-Einstellungen (Key-Value), z.B. Schichtbuch-Spalten-Reihenfolge.
CREATE TABLE "app_einstellungen" (
    "key" TEXT NOT NULL,
    "wert" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "app_einstellungen_pkey" PRIMARY KEY ("key")
);
