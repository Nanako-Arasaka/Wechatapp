import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/web",
  fullyParallel: true,
  use: {
    baseURL: "http://127.0.0.1:5173",
    launchOptions: process.platform === "darwin" ? { channel: "chrome" } : {},
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1280, height: 900 } } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
    {
      name: "compact",
      use: {
        viewport: { width: 320, height: 740 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: "npm run dev -- --port 5173 --strictPort",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
  },
});
