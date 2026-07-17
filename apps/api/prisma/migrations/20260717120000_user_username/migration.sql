-- Anmeldename (username) für Benutzer; E-Mail bleibt erhalten.
-- Bestehende Nutzer erhalten einen aus dem E-Mail-Lokalteil abgeleiteten,
-- eindeutigen Benutzernamen (Duplikate werden durchnummeriert).

ALTER TABLE "users" ADD COLUMN "username" TEXT;

-- Basiswert: Lokalteil der E-Mail, auf erlaubte Zeichen reduziert, klein.
UPDATE "users"
SET "username" = lower(regexp_replace(split_part("email", '@', 1), '[^a-zA-Z0-9._-]', '', 'g'));

-- Leere Ergebnisse abfangen.
UPDATE "users" SET "username" = 'user' WHERE "username" IS NULL OR "username" = '';

-- Duplikate eindeutig machen (stabile Reihenfolge nach Erstellzeitpunkt).
WITH nummeriert AS (
  SELECT "id",
         "username",
         row_number() OVER (PARTITION BY "username" ORDER BY "createdAt", "id") AS rn
  FROM "users"
)
UPDATE "users" u
SET "username" = u."username" || '_' || nummeriert.rn
FROM nummeriert
WHERE u."id" = nummeriert."id" AND nummeriert.rn > 1;

CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;
