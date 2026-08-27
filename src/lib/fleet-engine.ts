import { prisma } from "@/lib/prisma";

const ACTIVE_BOOKING_STATUSES = ["confirmed", "checked_in"] as const;

/**
 * Finds vehicles of `category` that have no overlapping active booking in
 * [startDate, endDate), excluding `excludeVehicleId` and `excludeBookingId`
 * (used when re-checking availability for the vehicle already tied to a
 * booking, e.g. during an extension request).
 */
export async function findAvailableVehiclesInCategory(params: {
  tenantId: string;
  category: string;
  startDate: Date;
  endDate: Date;
  excludeVehicleId?: string;
  excludeBookingId?: string;
}) {
  const candidates = await prisma.vehicle.findMany({
    where: {
      tenantId: params.tenantId,
      category: params.category,
      status: "available",
      id: params.excludeVehicleId ? { not: params.excludeVehicleId } : undefined,
    },
    include: {
      bookings: {
        where: {
          status: { in: [...ACTIVE_BOOKING_STATUSES] },
          id: params.excludeBookingId ? { not: params.excludeBookingId } : undefined,
          startDate: { lt: params.endDate },
          endDate: { gt: params.startDate },
        },
      },
    },
  });

  return candidates.filter((vehicle) => vehicle.bookings.length === 0);
}

export async function assignVehicleForBooking(params: {
  tenantId: string;
  category: string;
  startDate: Date;
  endDate: Date;
  excludeVehicleId?: string;
  excludeBookingId?: string;
}) {
  const [vehicle] = await findAvailableVehiclesInCategory(params);
  return vehicle ?? null;
}

/**
 * Smart Extension Engine: a customer (via WhatsApp/Web) asks to extend an
 * active rental. If their assigned vehicle is free for the extended window,
 * the extension is approved directly. If a *second* customer already has
 * that same vehicle booked starting in the extended window, the second
 * booking is automatically reassigned to another "o simile" vehicle in the
 * same category so the first customer's extension can still be approved.
 */
export async function resolveExtensionRequest(params: {
  tenantId: string;
  bookingId: string;
  requestedEndDate: Date;
}) {
  const booking = await prisma.booking.findFirstOrThrow({
    where: { id: params.bookingId, tenantId: params.tenantId },
    include: { vehicle: true },
  });

  if (!booking.vehicleId || !booking.vehicle) {
    throw new Error("Prolungamento disponibile solo per prenotazioni di noleggio auto.");
  }

  const conflictingBooking = await prisma.booking.findFirst({
    where: {
      tenantId: params.tenantId,
      vehicleId: booking.vehicleId,
      id: { not: booking.id },
      status: { in: [...ACTIVE_BOOKING_STATUSES] },
      startDate: { lt: params.requestedEndDate },
      endDate: { gt: booking.endDate },
    },
    orderBy: { startDate: "asc" },
  });

  if (!conflictingBooking) {
    return { approved: true as const, bumpedBookingId: null, reassignedVehicleId: null };
  }

  const alternative = await assignVehicleForBooking({
    tenantId: params.tenantId,
    category: booking.vehicle.category,
    startDate: conflictingBooking.startDate,
    endDate: conflictingBooking.endDate,
  });

  if (!alternative) {
    return { approved: false as const, bumpedBookingId: null, reassignedVehicleId: null };
  }

  return {
    approved: true as const,
    bumpedBookingId: conflictingBooking.id,
    reassignedVehicleId: alternative.id,
  };
}
