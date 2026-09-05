import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: "tablet",
      use: {
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: "mobile",
      use: {
        ...devices["Pixel 5"],
        viewport: { width: 375, height: 667 },
      },
    },
  ],
  webServer: [
    {
      command: "npm run dev",
      cwd: "./server",
      port: 3000,
      reuseExistingServer: true,
      timeout: 30000,
    },
    {
      command: "npm run dev",
      cwd: "./client",
      port: 5173,
      reuseExistingServer: true,
      timeout: 30000,
    },
  ],
});
