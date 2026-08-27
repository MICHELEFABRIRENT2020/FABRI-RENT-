import { describe, it, expect } from "vitest";
import { startOfWeek, weekDays, addDays } from "@/lib/week";

describe("startOfWeek", () => {
  it("returns the same Monday when given a Monday", () => {
    const monday = new Date("2026-08-24T15:30:00"); // a Monday
    const result = startOfWeek(monday);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(24);
    expect(result.getHours()).toBe(0);
  });

  it("rolls a Sunday back to the preceding Monday", () => {
    const sunday = new Date("2026-08-30T10:00:00"); // a Sunday
    const result = startOfWeek(sunday);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(24);
  });

  it("rolls a mid-week date back to that week's Monday", () => {
    const wednesday = new Date("2026-08-26T10:00:00");
    const result = startOfWeek(wednesday);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(24);
  });
});

describe("weekDays", () => {
  it("returns 7 consecutive days starting from the given Monday", () => {
    const monday = startOfWeek(new Date("2026-08-24T00:00:00"));
    const days = weekDays(monday);
    expect(days).toHaveLength(7);
    expect(days[0].getDay()).toBe(1);
    expect(days[6].getDay()).toBe(0); // Sunday
    expect(days[6].getDate()).toBe(30);
  });
});

describe("addDays", () => {
  it("adds positive and negative offsets correctly", () => {
    const base = new Date("2026-08-24T12:00:00");
    expect(addDays(base, 7).getDate()).toBe(31);
    expect(addDays(base, -7).getDate()).toBe(17);
  });
});
