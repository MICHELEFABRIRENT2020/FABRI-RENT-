/**
 * Global vehicle make/model catalog seed data (section 7).
 *
 * Hand-curated from public manufacturer model line-ups, scoped to the
 * makes and models actually relevant to a European/Italian car rental
 * fleet (city cars through SUVs, plus the light commercial vans rental
 * companies also run) rather than every trim ever sold worldwide. It is
 * NOT exhaustive - a tenant can still register a vehicle with free-text
 * brand/model that isn't in this list (see Vehicle.brand/model). Extend
 * this file and re-run `npm run db:seed-catalog` (idempotent upsert) to
 * add more; a future iteration could instead sync from a commercial
 * vehicle-data API (see PLATE_LOOKUP_API_KEY in .env.example, which can
 * also resolve make/model from a plate and could backfill this table).
 */
export const VEHICLE_CATALOG: { brand: string; category?: string; models: string[] }[] = [
  { brand: "Fiat", category: "City Car", models: ["Panda", "500", "500X", "500L", "Tipo", "Punto", "Doblo", "Ducato", "Talento"] },
  { brand: "Volkswagen", category: "Compact", models: ["Up!", "Polo", "Golf", "T-Cross", "T-Roc", "Tiguan", "Touran", "Passat", "Transporter", "Caddy"] },
  { brand: "Renault", category: "Compact", models: ["Twingo", "Clio", "Captur", "Megane", "Austral", "Kadjar", "Kangoo", "Trafic", "Master"] },
  { brand: "Peugeot", category: "Compact", models: ["108", "208", "2008", "308", "3008", "5008", "Partner", "Rifter", "Traveller"] },
  { brand: "Citroen", category: "Compact", models: ["C1", "C3", "C3 Aircross", "C4", "C4 Picasso", "C5 Aircross", "Berlingo", "Jumpy"] },
  { brand: "Opel", category: "Compact", models: ["Corsa", "Astra", "Crossland", "Grandland", "Mokka", "Combo", "Vivaro"] },
  { brand: "Ford", category: "Compact", models: ["Ka+", "Fiesta", "Focus", "Puma", "Kuga", "EcoSport", "Transit", "Transit Custom", "Tourneo Connect"] },
  { brand: "Toyota", category: "Compact", models: ["Aygo X", "Yaris", "Yaris Cross", "Corolla", "C-HR", "RAV4", "Proace"] },
  { brand: "Hyundai", category: "Compact", models: ["i10", "i20", "Bayon", "i30", "Kona", "Tucson", "Santa Fe"] },
  { brand: "Kia", category: "Compact", models: ["Picanto", "Rio", "Stonic", "Ceed", "Niro", "Sportage", "Sorento"] },
  { brand: "Nissan", category: "Compact", models: ["Micra", "Juke", "Qashqai", "X-Trail", "Leaf", "Primastar"] },
  { brand: "Dacia", category: "City Car", models: ["Sandero", "Sandero Stepway", "Duster", "Jogger", "Spring"] },
  { brand: "Skoda", category: "Compact", models: ["Fabia", "Scala", "Kamiq", "Octavia", "Karoq", "Kodiaq"] },
  { brand: "Seat", category: "Compact", models: ["Ibiza", "Arona", "Leon", "Ateca", "Tarraco"] },
  { brand: "BMW", category: "Premium", models: ["Serie 1", "Serie 2", "Serie 3", "Serie 5", "X1", "X2", "X3", "X5", "iX1"] },
  { brand: "Mercedes-Benz", category: "Premium", models: ["Classe A", "Classe B", "Classe C", "Classe E", "GLA", "GLB", "GLC", "Sprinter", "Vito", "Citan"] },
  { brand: "Audi", category: "Premium", models: ["A1", "A3", "A4", "A6", "Q2", "Q3", "Q5"] },
  { brand: "Jeep", category: "SUV", models: ["Renegade", "Compass", "Avenger", "Grand Cherokee", "Wrangler"] },
  { brand: "Alfa Romeo", category: "Premium", models: ["Giulietta", "Giulia", "Stelvio", "Tonale"] },
  { brand: "Lancia", category: "City Car", models: ["Ypsilon"] },
  { brand: "Smart", category: "City Car", models: ["Fortwo", "Forfour"] },
  { brand: "Mini", category: "Compact", models: ["Cooper", "Countryman", "Clubman"] },
  { brand: "Volvo", category: "Premium", models: ["XC40", "XC60", "XC90", "V60", "S60"] },
  { brand: "Suzuki", category: "Compact", models: ["Swift", "Ignis", "Vitara", "S-Cross", "Jimny"] },
  { brand: "Mazda", category: "Compact", models: ["Mazda2", "Mazda3", "CX-30", "CX-5"] },
  { brand: "Honda", category: "Compact", models: ["Jazz", "Civic", "HR-V", "CR-V"] },
  { brand: "Mitsubishi", category: "City Car", models: ["Space Star", "ASX", "Eclipse Cross", "Outlander"] },
  { brand: "Tesla", category: "Premium", models: ["Model 3", "Model Y", "Model S", "Model X"] },
  { brand: "Land Rover", category: "Premium", models: ["Range Rover Evoque", "Discovery Sport", "Defender"] },
  { brand: "Porsche", category: "Premium", models: ["Macan", "Cayenne", "911"] },
  { brand: "Iveco", category: "Furgone", models: ["Daily"] },
];
