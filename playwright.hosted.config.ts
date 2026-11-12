import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "tests/hosted",
  timeout: 120000,
  workers: 1,
  use: {
    ...devices["Desktop Chrome"],
    baseURL: process.env.HOSTED_PREVIEW_URL,
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    },
    trace: "off",
  },
});
