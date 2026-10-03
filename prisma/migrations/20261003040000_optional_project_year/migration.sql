-- Portfolio projects imported from photos may not know their year yet.
ALTER TABLE "PortfolioProject" ALTER COLUMN "year" DROP NOT NULL;
