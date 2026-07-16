-- CreateTable
CREATE TABLE "anhaenge" (
    "id" UUID NOT NULL,
    "eintragId" UUID NOT NULL,
    "hochgeladenVonId" UUID NOT NULL,
    "dateiname" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "groesse" INTEGER NOT NULL,
    "objectKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "anhaenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "anhaenge_objectKey_key" ON "anhaenge"("objectKey");

-- CreateIndex
CREATE INDEX "anhaenge_eintragId_idx" ON "anhaenge"("eintragId");

-- AddForeignKey
ALTER TABLE "anhaenge" ADD CONSTRAINT "anhaenge_eintragId_fkey" FOREIGN KEY ("eintragId") REFERENCES "schichtbucheintraege"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anhaenge" ADD CONSTRAINT "anhaenge_hochgeladenVonId_fkey" FOREIGN KEY ("hochgeladenVonId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
