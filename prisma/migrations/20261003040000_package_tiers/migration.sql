-- Package tiers (e.g. Silver / Gold / Platinum), each with its own price and coverage.
CREATE TABLE "PackageTier" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameFr" TEXT,
    "basePriceCents" INTEGER NOT NULL,
    "includedHours" INTEGER NOT NULL,
    "includedShooters" INTEGER NOT NULL DEFAULT 1,
    "editedImages" INTEGER,
    "turnaroundDays" INTEGER,
    "inclusions" TEXT[],
    "inclusionsFr" TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackageTier_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PackageTier_packageId_key_key" ON "PackageTier"("packageId", "key");
CREATE INDEX "PackageTier_packageId_sortOrder_idx" ON "PackageTier"("packageId", "sortOrder");

ALTER TABLE "PackageTier" ADD CONSTRAINT "PackageTier_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE CASCADE ON UPDATE CASCADE;
