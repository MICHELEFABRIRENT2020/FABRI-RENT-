import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";

const DESK_EMAIL = "desk@fabrirent.it";
const DESK_PASSWORD = "FabriDesk!2026";

test.describe("Desk walk-in contract creation (FLOW B)", () => {
  const customerEmail = `e2e-walkin-${Date.now()}@example.com`;

  test.afterAll(() => {
    try {
      execFileSync("npx", ["tsx", "e2e/helpers/teardown-walkin-customer.ts", customerEmail], { encoding: "utf-8", stdio: "pipe" });
    } catch (err) {
      // Surface teardown failures loudly - a silently-failed cleanup here
      // leaves a real booking behind that can starve vehicle availability
      // for the next run of this same test.
      console.error("[walk-in-contract e2e] teardown failed:", err);
      throw err;
    }
  });

  test("operator creates a customer, picks a vehicle, and lands on a fully-priced contract", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', DESK_EMAIL);
    await page.fill('input[name="password"]', DESK_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/");

    await page.goto("/desk/contratti/nuovo");
    await expect(page.getByRole("heading", { name: "Nuovo contratto (walk-in)" })).toBeVisible();

    await page.click('button:has-text("Nuovo cliente")');
    await page.fill('input[type="email"]', customerEmail);
    await page.locator('label:text("Nome completo") + input').fill("E2E Walk-in Customer");
    await page.locator('label:text("Telefono") + input').fill("+39 340 5551234");
    await page.click('button:has-text("Crea cliente")');
    await expect(page.getByText("E2E Walk-in Customer")).toBeVisible();

    await page.locator('button[role="combobox"]').first().click();
    await page.locator('[role="option"]').first().click();
    await expect(page.getByText(/EUR .*\/giorno/).first()).toBeVisible();

    await page.locator('button:has-text("EUR")').first().click();
    await page.locator('button:has-text("Franchigia Base")').first().click();

    await page.click('button:has-text("Crea contratto")');
    await page.waitForURL("**/desk/prenotazioni/**");

    // The contract detail page reuses CheckInPanel/PaymentPanel/PriceOverridePanel -
    // if any of these render, the booking was created with all required relations intact.
    // (getByRole, not getByText: Next.js's route announcer div echoes the
    // same text on navigation, which getByText would also match.)
    await expect(page.getByRole("heading", { name: "E2E Walk-in Customer" })).toBeVisible();
    await expect(page.getByText("Pagamenti")).toBeVisible();
    await expect(page.getByText("Check-in", { exact: true })).toBeVisible();
    await expect(page.getByText(/Totale: EUR \d/)).toBeVisible();
  });
});
