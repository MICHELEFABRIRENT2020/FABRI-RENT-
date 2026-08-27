import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("FabriAdmin!2026", 10);
  const operatorPassword = await bcrypt.hash("FabriDesk!2026", 10);

  await prisma.user.upsert({
    where: { email: "admin@fabrirent.it" },
    update: {},
    create: {
      fullName: "Amministratore Fabri GROUP",
      email: "admin@fabrirent.it",
      phone: "+39 000 0000000",
      role: "super_admin",
      passwordHash: adminPassword,
    },
  });

  await prisma.user.upsert({
    where: { email: "desk@fabrirent.it" },
    update: {},
    create: {
      fullName: "Operatore Desk",
      email: "desk@fabrirent.it",
      phone: "+39 000 0000001",
      role: "operator",
      passwordHash: operatorPassword,
    },
  });

  // Fleet - grouped by category so "o simile" assignment has real alternatives.
  const vehicles: { name: string; category: string; dailyRate: number; seats: number; transmission: string; fuelType: string; plate: string }[] = [
    { name: "Fiat Panda 1.0 Hybrid", category: "City Car", dailyRate: 35, seats: 4, transmission: "Manuale", fuelType: "Hybrid", plate: "FR001AA" },
    { name: "Toyota Aygo X", category: "City Car", dailyRate: 38, seats: 4, transmission: "Manuale", fuelType: "Benzina", plate: "FR002AA" },
    { name: "Fiat Tipo", category: "Berlina Compatta", dailyRate: 48, seats: 5, transmission: "Manuale", fuelType: "Diesel", plate: "FR003BB" },
    { name: "Volkswagen Golf", category: "Berlina Compatta", dailyRate: 55, seats: 5, transmission: "Automatico", fuelType: "Diesel", plate: "FR004BB" },
    { name: "Jeep Renegade", category: "SUV Compatto", dailyRate: 62, seats: 5, transmission: "Automatico", fuelType: "Hybrid", plate: "FR005CC" },
    { name: "Dacia Duster", category: "SUV Compatto", dailyRate: 58, seats: 5, transmission: "Manuale", fuelType: "Diesel", plate: "FR006CC" },
    { name: "Fiat 500L", category: "Monovolume", dailyRate: 65, seats: 7, transmission: "Manuale", fuelType: "Diesel", plate: "FR007DD" },
    { name: "Fiat Ducato", category: "Furgone", dailyRate: 85, seats: 3, transmission: "Manuale", fuelType: "Diesel", plate: "FR008EE" },
  ];

  for (const v of vehicles) {
    await prisma.vehicle.upsert({
      where: { plate: v.plate },
      update: {},
      create: { ...v, status: "available" },
    });
  }

  // Parking Go base rates (spec defaults).
  await prisma.parkingBaseRate.upsert({
    where: { category: "moto" },
    update: {},
    create: { category: "moto", dailyRate: 5, copertoUplift: 0.4 },
  });
  await prisma.parkingBaseRate.upsert({
    where: { category: "auto" },
    update: {},
    create: { category: "auto", dailyRate: 10, copertoUplift: 0.4 },
  });
  await prisma.parkingBaseRate.upsert({
    where: { category: "furgone" },
    update: {},
    create: { category: "furgone", dailyRate: 18, copertoUplift: 0.4 },
  });

  // Parking capacity caps.
  await prisma.parkingCapacity.upsert({
    where: { slotType: "coperto" },
    update: {},
    create: { slotType: "coperto", maxSlots: 20 },
  });
  await prisma.parkingCapacity.upsert({
    where: { slotType: "scoperto" },
    update: {},
    create: { slotType: "scoperto", maxSlots: 40 },
  });

  // Geo-localized insurance: Sud Italia never reaches 0 franchigia.
  const southTiers: { tier: "base" | "medium" | "full"; label: string; residualDeductible: number; dailyCost: number }[] = [
    { tier: "base", label: "Franchigia Base", residualDeductible: 1500, dailyCost: 12 },
    { tier: "medium", label: "Franchigia Medium", residualDeductible: 1000, dailyCost: 18 },
    { tier: "full", label: "Franchigia Full", residualDeductible: 500, dailyCost: 25 },
  ];
  for (const t of southTiers) {
    await prisma.insuranceOption.upsert({
      where: { zone_tier: { zone: "sud_italia", tier: t.tier } },
      update: {},
      create: { zone: "sud_italia", ...t, requiresCreditCard: false },
    });
  }

  // Centro/Nord Italia: same tiers plus KASKO Senza Cauzione (credit card only).
  const centroNordTiers: { tier: "base" | "medium" | "full" | "kasko_senza_cauzione"; label: string; residualDeductible: number; dailyCost: number; requiresCreditCard: boolean }[] = [
    { tier: "base", label: "Franchigia Base", residualDeductible: 1200, dailyCost: 10, requiresCreditCard: false },
    { tier: "medium", label: "Franchigia Medium", residualDeductible: 800, dailyCost: 16, requiresCreditCard: false },
    { tier: "full", label: "Franchigia Full", residualDeductible: 400, dailyCost: 22, requiresCreditCard: false },
    { tier: "kasko_senza_cauzione", label: "KASKO Senza Cauzione", residualDeductible: 0, dailyCost: 30, requiresCreditCard: true },
  ];
  for (const t of centroNordTiers) {
    await prisma.insuranceOption.upsert({
      where: { zone_tier: { zone: "centro_nord_italia", tier: t.tier } },
      update: {},
      create: { zone: "centro_nord_italia", ...t },
    });
  }

  // Upselling extras.
  const extras = [
    { code: "car_wash", label: "Lavaggio auto", price: 15, perDay: false },
    { code: "child_seat", label: "Seggiolino bimbi", price: 5, perDay: true },
    { code: "additional_driver", label: "Guidatore aggiuntivo", price: 8, perDay: true },
    { code: "shuttle", label: "Navetta", price: 20, perDay: false },
  ];
  for (const e of extras) {
    await prisma.extraService.upsert({ where: { code: e.code }, update: {}, create: e });
  }

  // Example seasonal pricing rule.
  await prisma.pricingRule.upsert({
    where: { id: "seed-alta-stagione-agosto" },
    update: {},
    create: {
      id: "seed-alta-stagione-agosto",
      name: "Alta stagione - Agosto",
      scope: "rent",
      type: "date_range",
      startDate: new Date(new Date().getFullYear(), 7, 1),
      endDate: new Date(new Date().getFullYear(), 7, 31),
      multiplier: 1.3,
      priority: 10,
    },
  });

  console.log("Seed completato.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
