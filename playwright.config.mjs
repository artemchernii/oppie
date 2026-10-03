import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://localhost:3110", ...devices["Desktop Chrome"] },
  webServer: { command: "PLAYWRIGHT_TEST=1 pnpm exec next dev -p 3110", url: "http://localhost:3110", reuseExistingServer: false, timeout: 120000 }
});
