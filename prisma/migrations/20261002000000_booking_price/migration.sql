-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "breakdown" JSONB,
ADD COLUMN     "subtotalCents" INTEGER,
ADD COLUMN     "taxCents" INTEGER,
ADD COLUMN     "totalCents" INTEGER;
