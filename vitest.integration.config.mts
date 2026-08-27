import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

/** Integration tests hit the real Postgres in DATABASE_URL - run separately from the fast unit suite (see package.json `test:integration`, CI needs a Postgres service). */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
    fileParallelism: false,
    setupFiles: ["./vitest.setup.ts"],
  },
});
