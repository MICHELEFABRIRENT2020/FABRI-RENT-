-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "latitude" DECIMAL(9,6),
ADD COLUMN     "longitude" DECIMAL(9,6),
ADD COLUMN     "place_id" TEXT;

