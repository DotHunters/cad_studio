-- Seasonal offers: optional strike-through price and offer end date on packages.
ALTER TABLE "Package" ADD COLUMN "regularPriceCents" INTEGER,
ADD COLUMN "offerEndsAt" TIMESTAMP(3);
