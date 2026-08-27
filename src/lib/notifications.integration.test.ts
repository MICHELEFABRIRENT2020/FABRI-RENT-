import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { refreshNotifications, listActiveNotifications } from "@/lib/notifications";

/**
 * Hits the real database (DATABASE_URL) - run via `npm run test:integration`,
 * separate from the fast unit suite. Creates and tears down its own
 * throwaway tenant/vehicle rather than depending on seed data, so it's
 * safe to run against a dev DB with real records in it.
 */
describe("refreshNotifications (integration)", () => {
  const tenantId = `test-tenant-notif-${Date.now()}`;
  let vehicleId: string;

  beforeAll(async () => {
    await prisma.tenant.create({ data: { id: tenantId, name: "Test Tenant Notifiche" } });
    const vehicle = await prisma.vehicle.create({
      data: {
        tenantId,
        name: "Test Vehicle",
        category: "Test",
        dailyRate: 30,
        bolloExpiryDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // expired yesterday
      },
    });
    vehicleId = vehicle.id;
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { tenantId } });
    await prisma.vehicle.deleteMany({ where: { tenantId } });
    await prisma.tenant.delete({ where: { id: tenantId } });
  });

  it("creates a critical bollo_scadenza notification for an expired vehicle document", async () => {
    await refreshNotifications(tenantId);
    const notifications = await listActiveNotifications(tenantId);

    const bolloNotification = notifications.find((n) => n.type === "bollo_scadenza" && n.entityId === vehicleId);
    expect(bolloNotification).toBeDefined();
    expect(bolloNotification?.severity).toBe("critical");
  });

  it("auto-resolves the notification once the underlying condition clears", async () => {
    await prisma.vehicle.update({ where: { id: vehicleId }, data: { bolloExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) } });
    await refreshNotifications(tenantId);

    const notifications = await listActiveNotifications(tenantId);
    const bolloNotification = notifications.find((n) => n.type === "bollo_scadenza" && n.entityId === vehicleId);
    expect(bolloNotification).toBeUndefined();

    const resolved = await prisma.notification.findFirst({ where: { tenantId, type: "bollo_scadenza", entityId: vehicleId } });
    expect(resolved?.dismissedAt).not.toBeNull();
  });

  it("preserves a manually-read notification's readAt across refreshes while the condition still holds", async () => {
    await prisma.vehicle.update({ where: { id: vehicleId }, data: { bolloExpiryDate: new Date(Date.now() - 1000) } });
    await refreshNotifications(tenantId);

    const [first] = await listActiveNotifications(tenantId);
    await prisma.notification.update({ where: { id: first.id }, data: { readAt: new Date() } });

    await refreshNotifications(tenantId);
    const afterSecondRefresh = await prisma.notification.findUnique({ where: { id: first.id } });
    expect(afterSecondRefresh?.readAt).not.toBeNull();
  });
});
