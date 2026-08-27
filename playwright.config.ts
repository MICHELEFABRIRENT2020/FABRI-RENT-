import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config (section 13). Uses the pre-installed Chromium at
 * /opt/pw-browsers/chromium when PLAYWRIGHT_BROWSERS_PATH points there
 * (this session's dev container) - CI installs its own via
 * `npx playwright install --with-deps chromium` (see .github/workflows/ci.yml)
 * so `executablePath` is only forced when the env var is set.
 */
export default defineConfig({
  testDir: "./e2e",
  // Serialized: this suite shares one dev-server process and one small
  // Postgres instance (no separate DB per worker) - concurrent workers
  // were observed to starve the server's Prisma connection pool and
  // cause unrelated requests to hang past the test timeout.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  timeout: 30_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: process.env.PLAYWRIGHT_BROWSERS_PATH
          ? { executablePath: `${process.env.PLAYWRIGHT_BROWSERS_PATH}/chromium` }
          : undefined,
      },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run start",
        url: "http://localhost:3000/api/health",
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
