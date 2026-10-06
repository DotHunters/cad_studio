-- Services become admin-managed rows (docs/superpowers/specs/2026-10-06-dynamic-services-design.md).
-- Data-preserving: enum values are rewritten to lowercase slugs in place.

CREATE TABLE "Service" (
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameFr" TEXT,
    "description" TEXT NOT NULL,
    "descriptionFr" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "tileImageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Service_pkey" PRIMARY KEY ("slug")
);

-- The six launch services, names copied from messages/en.json and messages/fr.json.
INSERT INTO "Service" ("slug", "name", "nameFr", "description", "descriptionFr", "sortOrder", "updatedAt") VALUES
  ('corporate', 'Corporate Events', 'Événements corporatifs', 'Conferences, launches, galas and on-site headshots.', 'Conférences, lancements, galas et portraits sur place.', 0, CURRENT_TIMESTAMP),
  ('wedding', 'Weddings', 'Mariages', 'Engagement, ceremony and reception.', 'Fiançailles, cérémonie et réception.', 1, CURRENT_TIMESTAMP),
  ('family', 'Family Events', 'Événements familiaux', 'Birthdays, anniversaries, baby showers and milestones.', 'Anniversaires, fêtes prénatales et grandes étapes.', 2, CURRENT_TIMESTAMP),
  ('gathering', 'Gatherings', 'Rassemblements', 'Community, cultural, religious and social events.', 'Événements communautaires, culturels, religieux et sociaux.', 3, CURRENT_TIMESTAMP),
  ('professional', 'Professional Photoshoots', 'Séances professionnelles', 'Portraits, headshots, branding and portfolios.', 'Portraits, photos professionnelles, image de marque et portfolios.', 4, CURRENT_TIMESTAMP),
  ('product', 'Product Photography', 'Photographie de produits', 'E-commerce, catalogue, lifestyle and flat-lay.', 'Commerce en ligne, catalogue, mise en situation et vue de dessus.', 5, CURRENT_TIMESTAMP);

-- Enum columns → slug text.
ALTER TABLE "Package" ALTER COLUMN "category" TYPE TEXT USING lower("category"::text);
ALTER TABLE "Quote" ALTER COLUMN "category" TYPE TEXT USING lower("category"::text);
ALTER TABLE "Booking" ALTER COLUMN "category" TYPE TEXT USING lower("category"::text);
ALTER TABLE "PortfolioProject" ALTER COLUMN "category" TYPE TEXT USING lower("category"::text);
ALTER TABLE "Image" ALTER COLUMN "category" TYPE TEXT USING lower("category"::text);
ALTER TABLE "Review" ALTER COLUMN "category" TYPE TEXT USING lower("category"::text);

-- Add-on services: enum array → join table.
CREATE TABLE "_AddOnToService" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_AddOnToService_AB_pkey" PRIMARY KEY ("A","B")
);
CREATE INDEX "_AddOnToService_B_index" ON "_AddOnToService"("B");
INSERT INTO "_AddOnToService" ("A", "B")
  SELECT DISTINCT a."id", lower(c::text) FROM "AddOn" a, unnest(a."categories") AS c;
ALTER TABLE "AddOn" DROP COLUMN "categories";

DROP TYPE "Category";

-- Home tile choices move from the SERVICE_TILE_IMAGES setting onto the service row.
UPDATE "Service" s SET "tileImageId" = i."id"
  FROM "SiteSetting" st, "Image" i
  WHERE st."key" = 'SERVICE_TILE_IMAGES' AND i."id" = st."value" ->> s."slug";
DELETE FROM "SiteSetting" WHERE "key" = 'SERVICE_TILE_IMAGES';

-- Foreign keys.
ALTER TABLE "Service" ADD CONSTRAINT "Service_tileImageId_fkey" FOREIGN KEY ("tileImageId") REFERENCES "Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Package" ADD CONSTRAINT "Package_category_fkey" FOREIGN KEY ("category") REFERENCES "Service"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_category_fkey" FOREIGN KEY ("category") REFERENCES "Service"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_category_fkey" FOREIGN KEY ("category") REFERENCES "Service"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PortfolioProject" ADD CONSTRAINT "PortfolioProject_category_fkey" FOREIGN KEY ("category") REFERENCES "Service"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Image" ADD CONSTRAINT "Image_category_fkey" FOREIGN KEY ("category") REFERENCES "Service"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_category_fkey" FOREIGN KEY ("category") REFERENCES "Service"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "_AddOnToService" ADD CONSTRAINT "_AddOnToService_A_fkey" FOREIGN KEY ("A") REFERENCES "AddOn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_AddOnToService" ADD CONSTRAINT "_AddOnToService_B_fkey" FOREIGN KEY ("B") REFERENCES "Service"("slug") ON DELETE CASCADE ON UPDATE CASCADE;
