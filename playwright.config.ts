import { defineConfig } from "@playwright/test";

const externalUrl = process.env.PREVIEW_BASE_URL;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 20_000,
  reporter: [
    ["list"],
    ["html", { open: "never" }],
    ["json", { outputFile: "test-results/report.json" }],
  ],
  use: {
    baseURL: externalUrl ?? "http://127.0.0.1:4173",
    browserName: "chromium",
    viewport: { width: 1366, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: externalUrl
    ? undefined
    : {
        command: "npm run preview",
        url: "http://127.0.0.1:4173",
        reuseExistingServer: false,
        timeout: 30_000,
      },
});
