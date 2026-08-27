import { describe, it, expect } from "vitest";
import { computeBillableDays, computeOverrunPenaltyDays } from "@/lib/rental-time";

describe("computeBillableDays", () => {
  it("bills exactly 1 day for a same-day rental under 24h", () => {
    const start = new Date("2026-01-01T10:00:00Z");
    const end = new Date("2026-01-01T18:00:00Z");
    expect(computeBillableDays(start, end)).toBe(1);
  });

  it("bills exactly 2 days for exactly 48h", () => {
    const start = new Date("2026-01-01T10:00:00Z");
    const end = new Date("2026-01-03T10:00:00Z");
    expect(computeBillableDays(start, end)).toBe(2);
  });

  it("rounds up any partial day overrun (24h01m -> 2 days)", () => {
    const start = new Date("2026-01-01T10:00:00Z");
    const end = new Date("2026-01-02T10:01:00Z");
    expect(computeBillableDays(start, end)).toBe(2);
  });

  it("never returns less than 1 day, even for an inverted/zero range", () => {
    const start = new Date("2026-01-02T10:00:00Z");
    const end = new Date("2026-01-01T10:00:00Z");
    expect(computeBillableDays(start, end)).toBe(1);
    expect(computeBillableDays(start, start)).toBe(1);
  });
});

describe("computeOverrunPenaltyDays", () => {
  it("charges 0 when returned on time or early", () => {
    const scheduled = new Date("2026-01-03T10:00:00Z");
    expect(computeOverrunPenaltyDays(scheduled, scheduled)).toBe(0);
    expect(computeOverrunPenaltyDays(scheduled, new Date("2026-01-03T09:00:00Z"))).toBe(0);
  });

  it("charges 1 full day for any overrun, even a single hour", () => {
    const scheduled = new Date("2026-01-03T10:00:00Z");
    expect(computeOverrunPenaltyDays(scheduled, new Date("2026-01-03T11:00:00Z"))).toBe(1);
  });

  it("charges 2 days once the overrun exceeds 24h", () => {
    const scheduled = new Date("2026-01-03T10:00:00Z");
    expect(computeOverrunPenaltyDays(scheduled, new Date("2026-01-04T11:00:00Z"))).toBe(2);
  });
});
