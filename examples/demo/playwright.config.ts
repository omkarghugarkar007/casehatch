import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  retries: 0,
  timeout: 15_000,
  reporter: [["list"]],
  use: { baseURL: "http://127.0.0.1:4179" },
  projects: [{ name: "api" }],
  webServer: {
    command: "node --experimental-strip-types app/server.ts",
    url: "http://127.0.0.1:4179/health",
    reuseExistingServer: false,
    timeout: 15_000,
  },
});
