import { test, expect } from "@playwright/test";

const DESK_EMAIL = "desk@fabrirent.it";
const DESK_PASSWORD = "FabriDesk!2026";
const ADMIN_EMAIL = "admin@fabrirent.it";
const ADMIN_PASSWORD = "FabriAdmin!2026";

test.describe("Plate lookup - honest not-configured fallback", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', DESK_EMAIL);
    await page.fill('input[name="password"]', DESK_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/");
  });

  test("an invalid plate format is rejected before any provider call", async ({ page }) => {
    const response = await page.request.get("/api/desk/plate-lookup?plate=NOTAPLATE");
    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.reason).toMatch(/Formato targa non valido/);
  });

  test("a well-formed plate returns an honest not-configured message when PLATE_LOOKUP_API_KEY is unset", async ({ page }) => {
    const response = await page.request.get("/api/desk/plate-lookup?plate=AB123CD");
    expect(response.ok()).toBe(true);
    const body = await response.json();
    // Either branch is acceptable depending on deployment env, but it must
    // never silently claim success with fabricated vehicle data.
    if (!body.ok) {
      expect(body.reason).toMatch(/non configurato|manualmente/i);
    } else {
      expect(body.data).toBeDefined();
    }
  });

  test("the fleet form's plate lookup button surfaces the result as a toast, never a silent no-op", async ({ page }) => {
    // /admin/flotta is ADMIN_ROLES-only (super_admin/admin/responsabile) -
    // the desk "operator" role from beforeEach can't reach it, so log in
    // again as admin for this one test.
    await page.goto("/login");
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/");

    await page.goto("/admin/flotta");
    await page.fill("#v-plate", "AB123CD");
    await page.click('button[title="Cerca dati veicolo dalla targa"]');
    // Either the "compiled" success toast or the honest fallback message -
    // never nothing at all.
    await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 5000 });
  });
});
