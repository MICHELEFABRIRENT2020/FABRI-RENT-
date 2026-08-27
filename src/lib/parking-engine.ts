import { prisma } from "@/lib/prisma";
import type { ParkingSlotType } from "@/generated/prisma/client";

const ACTIVE_BOOKING_STATUSES = ["confirmed", "checked_in"] as const;

/**
 * Hard parking capacity cap (super admin governance). Counts overlapping
 * active parking bookings for the given slot type against the configured
 * max, so the booking engine can block new reservations once the physical
 * lot is full for those dates - preventing overbooking.
 */
export async function checkParkingAvailability(params: {
  tenantId: string;
  slotType: ParkingSlotType;
  startDate: Date;
  endDate: Date;
}): Promise<{ available: boolean; occupied: number; capacity: number }> {
  const capacity = await prisma.parkingCapacity.findUnique({
    where: { tenantId_slotType: { tenantId: params.tenantId, slotType: params.slotType } },
  });

  const maxSlots = capacity?.maxSlots ?? 0;

  const occupied = await prisma.booking.count({
    where: {
      tenantId: params.tenantId,
      serviceType: "parking",
      parkingType: params.slotType,
      status: { in: [...ACTIVE_BOOKING_STATUSES] },
      startDate: { lt: params.endDate },
      endDate: { gt: params.startDate },
    },
  });

  return { available: occupied < maxSlots, occupied, capacity: maxSlots };
}
