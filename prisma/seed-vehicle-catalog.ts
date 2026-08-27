import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { VEHICLE_CATALOG } from "./vehicle-catalog-data";

const prisma = new PrismaClient();

const DIACRITICS_RE = /[̀-ͯ]/g; // "Combining Diacritical Marks" Unicode block

function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(DIACRITICS_RE, "") // strip diacritics (e.g. accented brand/model names)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  let brandCount = 0;
  let modelCount = 0;

  for (const entry of VEHICLE_CATALOG) {
    const brand = await prisma.vehicleBrand.upsert({
      where: { name: entry.brand },
      update: {},
      create: { name: entry.brand, slug: slugify(entry.brand) },
    });
    brandCount++;

    for (const modelName of entry.models) {
      await prisma.vehicleModel.upsert({
        where: { brandId_name: { brandId: brand.id, name: modelName } },
        update: {},
        create: { brandId: brand.id, name: modelName, category: entry.category },
      });
      modelCount++;
    }
  }

  console.log(`Catalogo veicoli: ${brandCount} marche, ${modelCount} modelli (upsert idempotente).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
