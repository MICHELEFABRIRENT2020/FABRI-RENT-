import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { generateSync } from "otplib";

const ADMIN_EMAIL = "admin@fabrirent.it";
const ADMIN_PASSWORD = "FabriAdmin!2026";

test.describe("Login (no 2FA)", () => {
  test("valid credentials reach the admin dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/");
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Dashboard Direzionale" })).toBeVisible();
  });

  test("wrong password shows an Italian error and stays on the login page", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', "wrong-password-123");
    await page.click('button[type="submit"]');
    await expect(page.getByText("Credenziali non valide")).toBeVisible();
    expect(page.url()).toContain("/login");
  });
});

test.describe("Login with 2FA enabled", () => {
  const email = `e2e-2fa-${Date.now()}@example.com`;
  let secret: string;
  let backupCodes: string[];
  let userId: string;

  test.beforeAll(() => {
    // Run as a standalone tsx process, not imported into this spec file:
    // the generated Prisma client uses import.meta, which Playwright's
    // own test-file transform can't load, while tsx (same tool
    // `npm run db:seed` uses) handles it correctly.
    const output = execFileSync("npx", ["tsx", "e2e/helpers/setup-2fa-user.ts", email], { encoding: "utf-8" });
    const fixture = JSON.parse(output.trim().split("\n").pop()!);
    userId = fixture.userId;
    secret = fixture.secret;
    backupCodes = fixture.backupCodes;
  });

  test.afterAll(() => {
    execFileSync("npx", ["tsx", "e2e/helpers/teardown-user.ts", userId], { encoding: "utf-8" });
  });

  test("prompts for a TOTP code and accepts a valid one", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', "TestPassword!2026");
    await page.click('button[type="submit"]');

    await expect(page.getByLabel("Codice a 6 cifre")).toBeVisible();

    const token = generateSync({ secret });
    await page.fill("#code", token);
    await page.click('button:has-text("Verifica")');
    await page.waitForURL("**/");
    expect(page.url()).not.toContain("/login");
  });

  test("rejects an invalid TOTP code", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', "TestPassword!2026");
    await page.click('button[type="submit"]');
    await expect(page.getByLabel("Codice a 6 cifre")).toBeVisible();

    await page.fill("#code", "000000");
    await page.click('button:has-text("Verifica")');
    await expect(page.getByText(/Codice 2FA non valido/)).toBeVisible();
  });

  test("accepts a backup code as an alternative to the TOTP code", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', "TestPassword!2026");
    await page.click('button[type="submit"]');
    await expect(page.getByLabel("Codice a 6 cifre")).toBeVisible();

    await page.click("text=Usa un codice di backup");
    await page.fill("#code", backupCodes[0]);
    await page.click('button:has-text("Verifica")');
    await page.waitForURL("**/");
    expect(page.url()).not.toContain("/login");
  });
});
