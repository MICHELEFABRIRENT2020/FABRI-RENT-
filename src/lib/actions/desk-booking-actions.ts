"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertTenant, WRITE_ROLES } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { computeBillableDays } from "@/lib/rental-time";
import { computeVehiclePrice, computeInsurancePrice, computeExtrasPrice } from "@/lib/pricing-engine";
import { findAvailableVehiclesInCategory, isVehicleAvailable } from "@/lib/fleet-engine";
import { assertInsuranceSelectable, isKasko } from "@/lib/insurance-zone";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Desk walk-in contract creation (section 6) - distinct from the public
 * booking wizard (src/lib/booking-service.ts): the operator picks a
 * *specific* vehicle (not a category to auto-assign "o simile"), no
 * Stripe PaymentIntent is created up front (payment is recorded
 * afterwards via src/lib/actions/payment-actions.ts - cash/POS/bonifico/
 * SumUp/Stripe, whatever the walk-in customer actually hands over), and
 * the resulting booking lands on the same /desk/prenotazioni/[id] page
 * used for every other contract, reusing CheckInPanel/PaymentPanel/
 * PriceOverridePanel rather than duplicating that UI.
 *
 * Pricing/availability logic (computeVehiclePrice, computeInsurancePrice,
 * computeExtrasPrice, contract numbering) is the same domain code the
 * public flow uses - only the orchestration differs.
 */

async function assertWrite() {
  const { user, tenantId } = await assertTenant();
  if (!WRITE_ROLES.includes(user.role)) throw new Error("Non autorizzato per questa operazione.");
  return { user, tenantId };
}

export async function createWalkInCustomer(params: {
  fullName: string;
  email: string;
  phone: string;
  idCardNumber?: string;
  driverLicenseNumber?: string;
}) {
  const { user, tenantId } = await assertWrite();

  const existing = await prisma.user.findUnique({ where: { email: params.email } });
  if (existing) throw new Error("Esiste gia' un cliente con questa email. Usa la ricerca per selezionarlo.");

  const customer = await prisma.user.create({
    data: {
      tenantId,
      fullName: params.fullName,
      email: params.email,
      phone: params.phone,
      role: "client",
      idCardNumber: params.idCardNumber || undefined,
      driverLicenseNumber: params.driverLicenseNumber || undefined,
    },
  });

  await logAudit({ tenantId, actorId: user.id, action: "walkin_customer_created", entityType: "user", entityId: customer.id });
  return { id: customer.id, fullName: customer.fullName, email: customer.email, phone: customer.phone };
}

export async function listVehicleCategories(): Promise<string[]> {
  const { tenantId } = await assertTenant();
  const vehicles = await prisma.vehicle.findMany({ where: { tenantId, status: "available" }, select: { category: true }, distinct: ["category"] });
  return vehicles.map((v) => v.category).sort();
}

export async function listAvailableVehiclesForDates(params: { category: string; startDate: string; endDate: string }) {
  const { tenantId } = await assertTenant();
  const vehicles = await findAvailableVehiclesInCategory({
    tenantId,
    category: params.category,
    startDate: new Date(params.startDate),
    endDate: new Date(params.endDate),
  });
  return vehicles.map((v) => ({ id: v.id, name: v.name, plate: v.plate, dailyRate: v.dailyRate.toString() }));
}

export async function listInsuranceOptionsForDesk() {
  const { tenantId } = await assertTenant();
  const options = await prisma.insuranceOption.findMany({ where: { tenantId, active: true } });
  return options.map((o) => ({
    id: o.id,
    label: o.label,
    zone: o.zone,
    tier: o.tier,
    dailyCost: o.dailyCost.toString(),
    requiresCreditCard: o.requiresCreditCard,
  }));
}

export async function listExtraServicesForDesk() {
  const { tenantId } = await assertTenant();
  const extras = await prisma.extraService.findMany({ where: { tenantId, active: true } });
  return extras.map((e) => ({ id: e.id, label: e.label, price: e.price.toString(), perDay: e.perDay }));
}

export async function createWalkInContract(params: {
  customerId: string;
  vehicleId: string;
  startDate: string;
  endDate: string;
  insuranceOptionId: string;
  extras: { extraServiceId: string; quantity: number }[];
  paymentIntent: "stripe" | "other";
}) {
  const { user, tenantId } = await assertWrite();
  const startDate = new Date(params.startDate);
  const endDate = new Date(params.endDate);
  if (endDate <= startDate) throw new Error("La data di riconsegna deve essere successiva alla data di ritiro.");

  const customer = await prisma.user.findFirst({ where: { id: params.customerId, tenantId, role: "client" } });
  if (!customer) throw new Error("Cliente non trovato.");

  const available = await isVehicleAvailable({ tenantId, vehicleId: params.vehicleId, startDate, endDate });
  if (!available) throw new Error("Il veicolo selezionato non e' piu' disponibile per queste date.");

  const insuranceOption = await prisma.insuranceOption.findFirstOrThrow({ where: { id: params.insuranceOptionId, tenantId } });
  assertInsuranceSelectable(insuranceOption, params.paymentIntent === "stripe" ? "credit_card" : "debit_card");

  const days = computeBillableDays(startDate, endDate);
  const { total: basePrice } = await computeVehiclePrice({ tenantId, vehicleId: params.vehicleId, startDate, endDate });
  const insurancePrice = await computeInsurancePrice(tenantId, insuranceOption.id, days);
  const extrasResult = await computeExtrasPrice(tenantId, params.extras, days);
  const totalPrice = Number((basePrice + insurancePrice + extrasResult.total).toFixed(2));
  const kasko = isKasko(insuranceOption.tier);
  const depositAmount = kasko ? 0 : Number(insuranceOption.residualDeductible);

  const tenant = await prisma.tenant.update({ where: { id: tenantId }, data: { nextContractNumber: { increment: 1 } } });
  const contractNumber = tenant.nextContractNumber - 1;
  const bookingId = crypto.randomUUID();

  const bookingData: Prisma.BookingCreateInput = {
    id: bookingId,
    tenant: { connect: { id: tenantId } },
    contractNumber,
    user: { connect: { id: customer.id } },
    serviceType: "rent",
    vehicle: { connect: { id: params.vehicleId } },
    startDate,
    endDate,
    location: tenant.address ?? "",
    insuranceOption: { connect: { id: insuranceOption.id } },
    basePrice,
    insurancePrice,
    extrasPrice: extrasResult.total,
    totalPrice,
    depositAmount,
    hasDeposit: !kasko,
    status: "confirmed",
    operator: { connect: { id: user.id } },
    extras: {
      create: extrasResult.lines.map((l) => ({
        extraServiceId: l.extraServiceId,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
      })),
    },
  };

  const booking = await prisma.booking.create({ data: bookingData });
  await logAudit({ tenantId, actorId: user.id, action: "walkin_contract_created", entityType: "booking", entityId: booking.id, metadata: { contractNumber, totalPrice } });
  revalidatePath("/desk/contratti");
  revalidatePath("/desk");
  return { bookingId: booking.id };
}
