/**
 * 24-Hour Time Slot Engine.
 *
 * Rental/parking periods are billed in exact 24h blocks starting from the
 * pickup instant. Any overrun past the scheduled return time - even by a
 * single hour - rounds up to a full extra day. The same rounding rule is
 * reused to compute the late-return penalty at check-out.
 */

const MS_PER_HOUR = 1000 * 60 * 60;
const MS_PER_DAY = MS_PER_HOUR * 24;

/** Number of billable 24h days between two instants. Any partial day rounds up. Minimum 1. */
export function computeBillableDays(start: Date, end: Date): number {
  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) return 1;
  return Math.max(1, Math.ceil(diffMs / MS_PER_DAY));
}

/**
 * Extra days to bill when the vehicle/parking spot is returned later than
 * scheduled. Returns 0 when the return happens at or before the scheduled
 * end date. Any overrun - even 1 hour - returns at least 1.
 */
export function computeOverrunPenaltyDays(scheduledEnd: Date, actualReturn: Date): number {
  const diffMs = actualReturn.getTime() - scheduledEnd.getTime();
  if (diffMs <= 0) return 0;
  return Math.max(1, Math.ceil(diffMs / MS_PER_DAY));
}

export function formatItalianDate(date: Date): string {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Rome",
  }).format(date);
}
