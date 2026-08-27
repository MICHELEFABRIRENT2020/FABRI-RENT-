/** Helpers to bridge <input type="datetime-local"> (local, no TZ) and ISO strings. */

export function defaultPickupValue(hoursFromNow = 2): string {
  const d = new Date();
  d.setHours(d.getHours() + hoursFromNow, 0, 0, 0);
  return toDatetimeLocalValue(d);
}

export function defaultReturnValue(daysFromNow = 3): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(10, 0, 0, 0);
  return toDatetimeLocalValue(d);
}

export function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

/** `datetime-local` input values have no timezone; treat them as local wall-clock time. */
export function datetimeLocalToISO(value: string): string {
  return new Date(value).toISOString();
}
