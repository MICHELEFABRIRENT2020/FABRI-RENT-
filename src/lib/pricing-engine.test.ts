import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@/generated/prisma/client";

const findUniqueOrThrow = vi.fn();
const findMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    parkingBaseRate: { findUniqueOrThrow: (...args: unknown[]) => findUniqueOrThrow(...args) },
    pricingRule: { findMany: (...args: unknown[]) => findMany(...args) },
  },
}));

const { computeParkingPrice, ParkingPricingNotConfiguredError } = await import("@/lib/pricing-engine");

const startDate = new Date("2026-09-10T10:00:00Z");
const endDate = new Date("2026-09-12T10:00:00Z"); // 2 billable days

beforeEach(() => {
  findUniqueOrThrow.mockReset();
  findMany.mockReset();
  findMany.mockResolvedValue([]); // no active dynamic pricing rules -> multiplier 1, fixedRate null
});

describe("computeParkingPrice", () => {
  it("computes the price unchanged when a ParkingBaseRate row exists (scoperto)", async () => {
    findUniqueOrThrow.mockResolvedValue({ dailyRate: 10, copertoUplift: 0.4 });

    const result = await computeParkingPrice({
      tenantId: "t1",
      category: "auto",
      slotType: "scoperto",
      startDate,
      endDate,
    });

    expect(result).toEqual({ days: 2, dailyRate: 10, total: 20, ruleName: null });
  });

  it("applies the coperto uplift unchanged when a ParkingBaseRate row exists (coperto)", async () => {
    findUniqueOrThrow.mockResolvedValue({ dailyRate: 10, copertoUplift: 0.4 });

    const result = await computeParkingPrice({
      tenantId: "t1",
      category: "auto",
      slotType: "coperto",
      startDate,
      endDate,
    });

    expect(result).toEqual({ days: 2, dailyRate: 14, total: 28, ruleName: null });
  });

  it("throws ParkingPricingNotConfiguredError (not the raw Prisma error) when no row is configured", async () => {
    findUniqueOrThrow.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("An operation failed because it depends on one or more records that were required but not found.", {
        code: "P2025",
        clientVersion: "6.19.3",
      })
    );

    await expect(
      computeParkingPrice({ tenantId: "t1", category: "moto", slotType: "scoperto", startDate, endDate })
    ).rejects.toBeInstanceOf(ParkingPricingNotConfiguredError);

    try {
      await computeParkingPrice({ tenantId: "t1", category: "moto", slotType: "scoperto", startDate, endDate });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ParkingPricingNotConfiguredError);
      expect((error as InstanceType<typeof ParkingPricingNotConfiguredError>).code).toBe("PARKING_PRICING_NOT_CONFIGURED");
      expect((error as Error).message).toContain("moto");
    }
  });

  it("does not transform an unrelated Prisma error into ParkingPricingNotConfiguredError", async () => {
    const connectionError = new Prisma.PrismaClientKnownRequestError("Can't reach database server", {
      code: "P1001",
      clientVersion: "6.19.3",
    });
    findUniqueOrThrow.mockRejectedValue(connectionError);

    await expect(
      computeParkingPrice({ tenantId: "t1", category: "furgone", slotType: "scoperto", startDate, endDate })
    ).rejects.toBe(connectionError);
  });

  it("propagates a completely unrelated error type unchanged", async () => {
    const bug = new TypeError("something else broke");
    findUniqueOrThrow.mockRejectedValue(bug);

    await expect(
      computeParkingPrice({ tenantId: "t1", category: "auto", slotType: "scoperto", startDate, endDate })
    ).rejects.toBe(bug);
  });
});
