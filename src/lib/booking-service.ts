import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { computeBillableDays } from "@/lib/rental-time";
import { computeVehiclePrice, computeParkingPrice, computeInsurancePrice, computeExtrasPrice } from "@/lib/pricing-engine";
import { assignVehicleForBooking } from "@/lib/fleet-engine";
import { checkParkingAvailability } from "@/lib/parking-engine";
import { assertInsuranceSelectable, isKasko } from "@/lib/insurance";
import {
  createRentalWithDepositIntent,
  createKaskoDirectCharge,
  createRentalChargeIntent,
  toStripeAmount,
} from "@/lib/stripe";
import type { CreateBookingInput } from "@/lib/validation/booking";
import type { DocumentType, Prisma } from "@/generated/prisma/client";

export class BookingConflictError extends Error {}

async function upsertCustomer(tenantId: string, customer: CreateBookingInput["customer"]) {
  return prisma.user.upsert({
    where: { email: customer.email },
    update: {
      fullName: customer.fullName,
      phone: customer.phone,
      idCardNumber: customer.idCardNumber,
      driverLicenseNumber: customer.driverLicenseNumber,
      idCardFrontUrl: customer.idCardFrontUrl,
      idCardBackUrl: customer.idCardBackUrl,
      licenseFrontUrl: customer.licenseFrontUrl,
      licenseBackUrl: customer.licenseBackUrl,
      companyName: customer.companyName || null,
      vatNumber: customer.vatNumber || null,
      sdiCode: customer.sdiCode || null,
      pec: customer.pec || null,
    },
    create: {
      tenantId,
      fullName: customer.fullName,
      email: customer.email,
      phone: customer.phone,
      role: "client",
      idCardNumber: customer.idCardNumber,
      driverLicenseNumber: customer.driverLicenseNumber,
      idCardFrontUrl: customer.idCardFrontUrl,
      idCardBackUrl: customer.idCardBackUrl,
      licenseFrontUrl: customer.licenseFrontUrl,
      licenseBackUrl: customer.licenseBackUrl,
      companyName: customer.companyName || null,
      vatNumber: customer.vatNumber || null,
      sdiCode: customer.sdiCode || null,
      pec: customer.pec || null,
    },
  });
}

function documentAuditRows(tenantId: string, userId: string, bookingId: string, customer: CreateBookingInput["customer"]) {
  const slots: { type: DocumentType; url?: string }[] = [
    { type: "id_card_front", url: customer.idCardFrontUrl },
    { type: "id_card_back", url: customer.idCardBackUrl },
    { type: "license_front", url: customer.licenseFrontUrl },
    { type: "license_back", url: customer.licenseBackUrl },
  ];

  return slots
    .filter((s) => s.url)
    .map((s) => ({ tenantId, userId, bookingId, documentType: s.type, fileUrl: s.url as string }));
}

/** Atomically reserves the next sequential contract number for the tenant (rent contracts only). */
async function nextContractNumber(tenantId: string): Promise<number> {
  const tenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: { nextContractNumber: { increment: 1 } },
  });
  return tenant.nextContractNumber - 1;
}

/**
 * Every Stripe PaymentIntent is created BEFORE any booking row is persisted,
 * using a pre-generated booking id. This way a Stripe failure never leaves
 * an orphaned, unpayable booking behind - only the (idempotent) customer
 * upsert happens first. The booking + extras + document audits + payment
 * row(s) are then written atomically in a single transaction.
 */
export async function createBooking(tenantId: string, input: CreateBookingInput) {
  const startDate = new Date(input.startDate);
  const endDate = new Date(input.endDate);
  const days = computeBillableDays(startDate, endDate);
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
  const customerUser = await upsertCustomer(tenantId, input.customer);
  const extrasResult = await computeExtrasPrice(tenantId, input.extras, days);
  const bookingId = crypto.randomUUID();

  if (input.serviceType === "rent") {
    const vehicle = await assignVehicleForBooking({
      tenantId,
      category: input.vehicleCategory,
      startDate,
      endDate,
    });
    if (!vehicle) {
      throw new BookingConflictError(
        `Nessun veicolo disponibile nella categoria "${input.vehicleCategory}" per le date selezionate.`
      );
    }

    const insuranceOption = await prisma.insuranceOption.findFirstOrThrow({
      where: { id: input.insuranceOptionId, tenantId },
    });
    assertInsuranceSelectable(insuranceOption, input.paymentMethod);

    const { total: basePrice } = await computeVehiclePrice({ tenantId, vehicleId: vehicle.id, startDate, endDate });
    const insurancePrice = await computeInsurancePrice(tenantId, insuranceOption.id, days);
    const totalPrice = Number((basePrice + insurancePrice + extrasResult.total).toFixed(2));
    const kasko = isKasko(insuranceOption.tier);
    const depositAmount = kasko ? 0 : Number(insuranceOption.residualDeductible);
    const contractNumber = await nextContractNumber(tenantId);

    const bookingData: Prisma.BookingCreateInput = {
      id: bookingId,
      tenant: { connect: { id: tenantId } },
      contractNumber,
      user: { connect: { id: customerUser.id } },
      serviceType: "rent",
      vehicle: { connect: { id: vehicle.id } },
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
      paymentMethod: input.paymentMethod === "credit_card" || input.paymentMethod === "debit_card" ? "stripe" : undefined,
      extras: {
        create: extrasResult.lines.map((l) => ({
          extraServiceId: l.extraServiceId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        })),
      },
    };

    let clientSecret: string | null;
    let paymentRows: Prisma.PaymentCreateManyInput[];

    if (kasko) {
      const intent = await createKaskoDirectCharge({
        amountEuroCents: toStripeAmount(totalPrice),
        bookingId,
        customerEmail: customerUser.email,
      });
      clientSecret = intent.client_secret;
      paymentRows = [
        { tenantId, bookingId, type: "kasko_charge", method: "stripe", amount: totalPrice, captureMethod: "automatic", stripePaymentIntentId: intent.id },
      ];
    } else {
      // Single PaymentIntent authorizes rental + deposit together (manual
      // capture). The webhook captures the rental portion immediately on
      // authorization and leaves the deposit portion held until check-out.
      const combinedIntent = await createRentalWithDepositIntent({
        rentalAmountEuroCents: toStripeAmount(totalPrice),
        depositAmountEuroCents: toStripeAmount(depositAmount),
        bookingId,
        customerEmail: customerUser.email,
      });
      clientSecret = combinedIntent.client_secret;
      paymentRows = [
        { tenantId, bookingId, type: "rental_charge", method: "stripe", amount: totalPrice, captureMethod: "manual", stripePaymentIntentId: combinedIntent.id },
        { tenantId, bookingId, type: "deposit_authorization", method: "stripe", amount: depositAmount, captureMethod: "manual", stripePaymentIntentId: combinedIntent.id },
      ];
    }

    const [booking] = await prisma.$transaction([
      prisma.booking.create({ data: bookingData }),
      prisma.documentAudit.createMany({ data: documentAuditRows(tenantId, customerUser.id, bookingId, input.customer) }),
      prisma.payment.createMany({ data: paymentRows }),
    ]);

    return { booking, clientSecret };
  }

  // Parking (Parking Go)
  const availability = await checkParkingAvailability({
    tenantId,
    slotType: input.parkingType,
    startDate,
    endDate,
  });
  if (!availability.available) {
    throw new BookingConflictError(
      `Capienza massima raggiunta per i posti "${input.parkingType}" nelle date selezionate.`
    );
  }

  const { total: basePrice } = await computeParkingPrice({
    tenantId,
    category: input.parkingCategory,
    slotType: input.parkingType,
    startDate,
    endDate,
  });
  const totalPrice = Number((basePrice + extrasResult.total).toFixed(2));

  const intent = await createRentalChargeIntent({
    amountEuroCents: toStripeAmount(totalPrice),
    bookingId,
    customerEmail: customerUser.email,
  });

  const bookingData: Prisma.BookingCreateInput = {
    id: bookingId,
    tenant: { connect: { id: tenantId } },
    user: { connect: { id: customerUser.id } },
    serviceType: "parking",
    parkingType: input.parkingType,
    parkingCategory: input.parkingCategory,
    keysLeft: input.keysLeft,
    startDate,
    endDate,
    location: tenant.address ?? "",
    basePrice,
    extrasPrice: extrasResult.total,
    totalPrice,
    depositAmount: 0,
    hasDeposit: false,
    paymentMethod: "stripe",
    extras: {
      create: extrasResult.lines.map((l) => ({
        extraServiceId: l.extraServiceId,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
      })),
    },
  };

  const [booking] = await prisma.$transaction([
    prisma.booking.create({ data: bookingData }),
    prisma.documentAudit.createMany({ data: documentAuditRows(tenantId, customerUser.id, bookingId, input.customer) }),
    prisma.payment.create({
      data: { tenantId, bookingId, type: "rental_charge", method: "stripe", amount: totalPrice, captureMethod: "automatic", stripePaymentIntentId: intent.id },
    }),
  ]);

  return { booking, clientSecret: intent.client_secret };
}
