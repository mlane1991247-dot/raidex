const { defineConfig, devices } = require("@playwright/test");

const BASE = process.env.BASE_URL || "http://localhost:8787";

module.exports = defineConfig({
  testDir: ".",
  timeout: 45000,
  fullyParallel: true,
  reporter: [["list"]],
  globalTeardown: require.resolve("./cleanup.js"),
  use: {
    baseURL: BASE,
    trace: "on-first-retry",
    viewport: { width: 420, height: 800 }, // mobile-first
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 420, height: 800 } },
    },
  ],
});
