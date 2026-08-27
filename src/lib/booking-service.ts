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
import type { DocumentType } from "@/generated/prisma/client";

const HQ_LOCATION = "Via Privata Detta Sacra 33";

export class BookingConflictError extends Error {}

async function upsertCustomer(customer: CreateBookingInput["customer"]) {
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

async function createDocumentAudits(userId: string, bookingId: string, customer: CreateBookingInput["customer"]) {
  const slots: { type: DocumentType; url?: string }[] = [
    { type: "id_card_front", url: customer.idCardFrontUrl },
    { type: "id_card_back", url: customer.idCardBackUrl },
    { type: "license_front", url: customer.licenseFrontUrl },
    { type: "license_back", url: customer.licenseBackUrl },
  ];

  const rows = slots.filter((s) => s.url);
  if (rows.length === 0) return;

  await prisma.documentAudit.createMany({
    data: rows.map((s) => ({
      userId,
      bookingId,
      documentType: s.type,
      fileUrl: s.url as string,
    })),
  });
}

export async function createBooking(input: CreateBookingInput) {
  const startDate = new Date(input.startDate);
  const endDate = new Date(input.endDate);
  const days = computeBillableDays(startDate, endDate);
  const customerUser = await upsertCustomer(input.customer);

  const extrasResult = await computeExtrasPrice(input.extras, days);

  if (input.serviceType === "rent") {
    const vehicle = await assignVehicleForBooking({
      category: input.vehicleCategory,
      startDate,
      endDate,
    });
    if (!vehicle) {
      throw new BookingConflictError(
        `Nessun veicolo disponibile nella categoria "${input.vehicleCategory}" per le date selezionate.`
      );
    }

    const insuranceOption = await prisma.insuranceOption.findUniqueOrThrow({
      where: { id: input.insuranceOptionId },
    });
    assertInsuranceSelectable(insuranceOption, input.paymentMethod);

    const { total: basePrice } = await computeVehiclePrice({ vehicleId: vehicle.id, startDate, endDate });
    const insurancePrice = await computeInsurancePrice(insuranceOption.id, days);
    const totalPrice = Number((basePrice + insurancePrice + extrasResult.total).toFixed(2));
    const kasko = isKasko(insuranceOption.tier);
    const depositAmount = kasko ? 0 : Number(insuranceOption.residualDeductible);

    const booking = await prisma.booking.create({
      data: {
        userId: customerUser.id,
        serviceType: "rent",
        vehicleId: vehicle.id,
        startDate,
        endDate,
        location: HQ_LOCATION,
        insuranceOptionId: insuranceOption.id,
        basePrice,
        insurancePrice,
        extrasPrice: extrasResult.total,
        totalPrice,
        depositAmount,
        hasDeposit: !kasko,
        extras: {
          create: extrasResult.lines.map((l) => ({
            extraServiceId: l.extraServiceId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
          })),
        },
      },
    });

    await createDocumentAudits(customerUser.id, booking.id, input.customer);

    let clientSecret: string | null = null;
    if (kasko) {
      const intent = await createKaskoDirectCharge({
        amountEuroCents: toStripeAmount(totalPrice),
        bookingId: booking.id,
        customerEmail: customerUser.email,
      });
      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          type: "kasko_charge",
          amount: totalPrice,
          captureMethod: "automatic",
          stripePaymentIntentId: intent.id,
        },
      });
      clientSecret = intent.client_secret;
    } else {
      // Single PaymentIntent authorizes rental + deposit together (manual
      // capture). The webhook captures the rental portion immediately on
      // authorization and leaves the deposit portion held until check-out.
      const combinedIntent = await createRentalWithDepositIntent({
        rentalAmountEuroCents: toStripeAmount(totalPrice),
        depositAmountEuroCents: toStripeAmount(depositAmount),
        bookingId: booking.id,
        customerEmail: customerUser.email,
      });
      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          type: "rental_charge",
          amount: totalPrice,
          captureMethod: "manual",
          stripePaymentIntentId: combinedIntent.id,
        },
      });
      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          type: "deposit_authorization",
          amount: depositAmount,
          captureMethod: "manual",
          stripePaymentIntentId: combinedIntent.id,
        },
      });

      clientSecret = combinedIntent.client_secret;
    }

    return { booking, clientSecret };
  }

  // Parking (Parking Go)
  const availability = await checkParkingAvailability({
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
    category: input.parkingCategory,
    slotType: input.parkingType,
    startDate,
    endDate,
  });
  const totalPrice = Number((basePrice + extrasResult.total).toFixed(2));

  const booking = await prisma.booking.create({
    data: {
      userId: customerUser.id,
      serviceType: "parking",
      parkingType: input.parkingType,
      parkingCategory: input.parkingCategory,
      keysLeft: input.keysLeft,
      startDate,
      endDate,
      location: HQ_LOCATION,
      basePrice,
      extrasPrice: extrasResult.total,
      totalPrice,
      depositAmount: 0,
      hasDeposit: false,
      extras: {
        create: extrasResult.lines.map((l) => ({
          extraServiceId: l.extraServiceId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        })),
      },
    },
  });

  await createDocumentAudits(customerUser.id, booking.id, input.customer);

  const intent = await createRentalChargeIntent({
    amountEuroCents: toStripeAmount(totalPrice),
    bookingId: booking.id,
    customerEmail: customerUser.email,
  });
  await prisma.payment.create({
    data: {
      bookingId: booking.id,
      type: "rental_charge",
      amount: totalPrice,
      captureMethod: "automatic",
      stripePaymentIntentId: intent.id,
    },
  });

  return { booking, clientSecret: intent.client_secret };
}
