import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { id: "seed-tenant-fabrigroup" },
    update: {},
    create: {
      id: "seed-tenant-fabrigroup",
      name: "Fabri Rent Campania",
      vatNumber: "08118351540",
      pec: "FABRIRENTMULTISERVICE@PEC.IT",
      address: "Via Privata Detta Sacra 33",
      phone: "03859111209",
      mobilePhone: "3509656394",
      email: "FABRIRENTSRLS@LIBERO.IT",
      openingHours: "09:30-20:00",
      franchigiaRcaAmount: 1500,
      franchigiaKaskoAmount: 0,
      franchigiaFurtoAmount: 1000,
      franchigiaIncendioAmount: 1000,
      franchigiaDanniAmount: 500,
      maintenanceIntervalKm: 10000,
    },
  });

  const location = await prisma.location.upsert({
    where: { id: "seed-location-hq" },
    update: {},
    create: {
      id: "seed-location-hq",
      tenantId: tenant.id,
      name: "Sede Centrale",
      address: "Via Privata Detta Sacra 33",
      isPrimary: true,
    },
  });

  const adminPassword = await bcrypt.hash("FabriAdmin!2026", 10);
  const operatorPassword = await bcrypt.hash("FabriDesk!2026", 10);
  const officinaPassword = await bcrypt.hash("FabriOfficina!2026", 10);
  const contabilitaPassword = await bcrypt.hash("FabriConta!2026", 10);

  await prisma.user.upsert({
    where: { email: "admin@fabrirent.it" },
    update: {},
    create: {
      tenantId: tenant.id,
      locationId: location.id,
      fullName: "Amministratore FabriGroup",
      email: "admin@fabrirent.it",
      phone: "+39 000 0000000",
      role: "admin",
      passwordHash: adminPassword,
    },
  });

  await prisma.user.upsert({
    where: { email: "desk@fabrirent.it" },
    update: {},
    create: {
      tenantId: tenant.id,
      locationId: location.id,
      fullName: "Operatore Desk",
      email: "desk@fabrirent.it",
      phone: "+39 000 0000001",
      role: "operator",
      passwordHash: operatorPassword,
    },
  });

  await prisma.user.upsert({
    where: { email: "officina@fabrirent.it" },
    update: {},
    create: {
      tenantId: tenant.id,
      locationId: location.id,
      fullName: "Responsabile Officina",
      email: "officina@fabrirent.it",
      phone: "+39 000 0000002",
      role: "officina",
      passwordHash: officinaPassword,
    },
  });

  await prisma.user.upsert({
    where: { email: "contabilita@fabrirent.it" },
    update: {},
    create: {
      tenantId: tenant.id,
      locationId: location.id,
      fullName: "Ufficio Contabilita'",
      email: "contabilita@fabrirent.it",
      phone: "+39 000 0000003",
      role: "contabilita",
      passwordHash: contabilitaPassword,
    },
  });

  // Fleet - grouped by category so "o simile" assignment has real alternatives.
  const vehicles: {
    name: string;
    brand: string;
    model: string;
    category: string;
    dailyRate: number;
    seats: number;
    transmission: string;
    fuelType: string;
    plate: string;
    chassisNumber: string;
    year: number;
    odometerKm: number;
  }[] = [
    { name: "Fiat Panda 1.0 Hybrid", brand: "Fiat", model: "Panda", category: "City Car", dailyRate: 35, seats: 4, transmission: "Manuale", fuelType: "Hybrid", plate: "FR001AA", chassisNumber: "ZFA31200000000001", year: 2023, odometerKm: 18000 },
    { name: "Toyota Aygo X", brand: "Toyota", model: "Aygo X", category: "City Car", dailyRate: 38, seats: 4, transmission: "Manuale", fuelType: "Benzina", plate: "FR002AA", chassisNumber: "VNKKD0AX000000002", year: 2023, odometerKm: 12500 },
    { name: "Fiat Tipo", brand: "Fiat", model: "Tipo", category: "Berlina Compatta", dailyRate: 48, seats: 5, transmission: "Manuale", fuelType: "Diesel", plate: "FR003BB", chassisNumber: "ZFA35600000000003", year: 2022, odometerKm: 41000 },
    { name: "Volkswagen Golf", brand: "Volkswagen", model: "Golf", category: "Berlina Compatta", dailyRate: 55, seats: 5, transmission: "Automatico", fuelType: "Diesel", plate: "FR004BB", chassisNumber: "WVWZZZ1KZ0000004", year: 2022, odometerKm: 38500 },
    { name: "Jeep Renegade", brand: "Jeep", model: "Renegade", category: "SUV Compatto", dailyRate: 62, seats: 5, transmission: "Automatico", fuelType: "Hybrid", plate: "FR005CC", chassisNumber: "ZACNJABB00000005", year: 2023, odometerKm: 9800 },
    { name: "Dacia Duster", brand: "Dacia", model: "Duster", category: "SUV Compatto", dailyRate: 58, seats: 5, transmission: "Manuale", fuelType: "Diesel", plate: "FR006CC", chassisNumber: "UU1HSDCF00000006", year: 2021, odometerKm: 62000 },
    { name: "Fiat 500L", brand: "Fiat", model: "500L", category: "Monovolume", dailyRate: 65, seats: 7, transmission: "Manuale", fuelType: "Diesel", plate: "FR007DD", chassisNumber: "ZFA35100000000007", year: 2021, odometerKm: 55000 },
    { name: "Fiat Ducato", brand: "Fiat", model: "Ducato", category: "Furgone", dailyRate: 85, seats: 3, transmission: "Manuale", fuelType: "Diesel", plate: "FR008EE", chassisNumber: "ZFA25000000000008", year: 2020, odometerKm: 78000 },
  ];

  const oneYear = 365 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  for (const [i, v] of vehicles.entries()) {
    const vehicle = await prisma.vehicle.upsert({
      where: { tenantId_plate: { tenantId: tenant.id, plate: v.plate } },
      update: {},
      create: {
        tenantId: tenant.id,
        locationId: location.id,
        ...v,
        status: "available",
        ownershipType: "aziendale",
        purchaseVendor: "Concessionaria Demo",
        purchaseDate: new Date(now - oneYear * 2),
        purchasePrice: v.dailyRate * 300,
        purchasePaymentMethod: "bonifico",
        // staggered expiries to exercise the green/yellow/red compliance colors
        bolloExpiryDate: new Date(now + oneYear * (i % 3 === 0 ? -0.02 : i % 3 === 1 ? 0.03 : 0.6)),
        revisioneExpiryDate: new Date(now + oneYear * (i % 3 === 0 ? -0.01 : i % 3 === 1 ? 0.05 : 0.8)),
      },
    });

    await prisma.vehicleInsurancePolicy.upsert({
      where: { id: `seed-policy-${v.plate}` },
      update: {},
      create: {
        id: `seed-policy-${v.plate}`,
        tenantId: tenant.id,
        vehicleId: vehicle.id,
        company: "Generali Assicurazioni",
        policyNumber: `POL-${v.plate}`,
        rcaAmount: 0,
        kaskoAmount: 500,
        theftFireAmount: 1000,
        damageAmount: 500,
        periodStart: new Date(now - oneYear * 0.5),
        periodEnd: new Date(now + oneYear * (i % 3 === 1 ? 0.02 : 0.5)),
        premium: 900 + i * 20,
        broker: "Broker Demo Assicurazioni",
        roadsideAssistance: true,
        gpsTracking: false,
      },
    });
  }

  // Parking Go base rates (spec defaults).
  await prisma.parkingBaseRate.upsert({
    where: { tenantId_category: { tenantId: tenant.id, category: "moto" } },
    update: {},
    create: { tenantId: tenant.id, category: "moto", dailyRate: 5, copertoUplift: 0.4 },
  });
  await prisma.parkingBaseRate.upsert({
    where: { tenantId_category: { tenantId: tenant.id, category: "auto" } },
    update: {},
    create: { tenantId: tenant.id, category: "auto", dailyRate: 10, copertoUplift: 0.4 },
  });
  await prisma.parkingBaseRate.upsert({
    where: { tenantId_category: { tenantId: tenant.id, category: "furgone" } },
    update: {},
    create: { tenantId: tenant.id, category: "furgone", dailyRate: 18, copertoUplift: 0.4 },
  });

  // Parking capacity caps.
  await prisma.parkingCapacity.upsert({
    where: { tenantId_slotType: { tenantId: tenant.id, slotType: "coperto" } },
    update: {},
    create: { tenantId: tenant.id, slotType: "coperto", maxSlots: 20 },
  });
  await prisma.parkingCapacity.upsert({
    where: { tenantId_slotType: { tenantId: tenant.id, slotType: "scoperto" } },
    update: {},
    create: { tenantId: tenant.id, slotType: "scoperto", maxSlots: 40 },
  });

  // Geo-localized insurance: Sud Italia never reaches 0 franchigia.
  const southTiers: { tier: "base" | "medium" | "full"; label: string; residualDeductible: number; dailyCost: number }[] = [
    { tier: "base", label: "Franchigia Base", residualDeductible: 1500, dailyCost: 12 },
    { tier: "medium", label: "Franchigia Medium", residualDeductible: 1000, dailyCost: 18 },
    { tier: "full", label: "Franchigia Full", residualDeductible: 500, dailyCost: 25 },
  ];
  for (const t of southTiers) {
    await prisma.insuranceOption.upsert({
      where: { tenantId_zone_tier: { tenantId: tenant.id, zone: "sud_italia", tier: t.tier } },
      update: {},
      create: { tenantId: tenant.id, zone: "sud_italia", ...t, requiresCreditCard: false },
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
      where: { tenantId_zone_tier: { tenantId: tenant.id, zone: "centro_nord_italia", tier: t.tier } },
      update: {},
      create: { tenantId: tenant.id, zone: "centro_nord_italia", ...t },
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
    await prisma.extraService.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: e.code } },
      update: {},
      create: { tenantId: tenant.id, ...e },
    });
  }

  // Example seasonal pricing rule.
  await prisma.pricingRule.upsert({
    where: { id: "seed-alta-stagione-agosto" },
    update: {},
    create: {
      id: "seed-alta-stagione-agosto",
      tenantId: tenant.id,
      name: "Alta stagione - Agosto",
      scope: "rent",
      type: "date_range",
      startDate: new Date(new Date().getFullYear(), 7, 1),
      endDate: new Date(new Date().getFullYear(), 7, 31),
      multiplier: 1.3,
      priority: 10,
    },
  });

  // Officina catalog (section 11).
  const workshopCatalog: { category: "meccanica" | "carrozzeria" | "gommista" | "elettrauto"; items: string[] }[] = [
    {
      category: "meccanica",
      items: [
        "Cambio olio", "Sostituzione filtri", "Freni - pastiglie", "Freni - dischi", "Ammortizzatori",
        "Braccetti sospensione", "Sospensioni", "Batteria", "Cinghia distribuzione", "Frizione",
        "Cambio", "Revisione motore", "Impianto raffreddamento", "Climatizzazione", "Impianto scarico",
        "Elettronica di bordo", "Diagnosi computerizzata",
      ],
    },
    {
      category: "carrozzeria",
      items: ["Graffio", "Ammaccatura", "Paraurti", "Cofano", "Portiera", "Parafango", "Vetri", "Fari", "Verniciatura"],
    },
    {
      category: "gommista",
      items: ["Sostituzione pneumatici", "Equilibratura", "Convergenza", "Riparazione foratura"],
    },
    {
      category: "elettrauto",
      items: ["Batteria", "Alternatore", "Centralina", "Sensori", "Luci", "Cablaggio"],
    },
  ];
  for (const group of workshopCatalog) {
    for (const label of group.items) {
      await prisma.workshopCatalogItem.upsert({
        where: { tenantId_category_label: { tenantId: tenant.id, category: group.category, label } },
        update: {},
        create: { tenantId: tenant.id, category: group.category, label },
      });
    }
  }

  console.log("Seed completato.");
  console.log("Login demo:");
  console.log("  admin@fabrirent.it / FabriAdmin!2026");
  console.log("  desk@fabrirent.it / FabriDesk!2026");
  console.log("  officina@fabrirent.it / FabriOfficina!2026");
  console.log("  contabilita@fabrirent.it / FabriConta!2026");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
