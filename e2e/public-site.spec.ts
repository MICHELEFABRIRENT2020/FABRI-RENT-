import { test, expect } from "@playwright/test";

test.describe("Public site", () => {
  test("homepage loads with booking widget and directions card", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Noleggio auto e parcheggio/i })).toBeVisible();
    await expect(page.getByText("Come raggiungerci")).toBeVisible();
  });

  test("directions card offers a Maps link even without an API key configured", async ({ page }) => {
    await page.goto("/");
    const directionsLink = page.getByRole("link", { name: "Indicazioni stradali" });
    await expect(directionsLink).toBeVisible();
    await expect(directionsLink).toHaveAttribute("href", /google\.com\/maps\/dir/);
  });

  test("health check endpoint reports a connected database", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(body.database).toBe("connected");
  });
});
