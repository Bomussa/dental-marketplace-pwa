import { existsSync } from "node:fs";
import { loadEnvConfig } from "@next/env";
import { defineConfig, devices } from "@playwright/test";

loadEnvConfig(process.cwd());

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const usesExternalBaseURL = Boolean(process.env.PLAYWRIGHT_BASE_URL);
const webServerCommand = process.env.PLAYWRIGHT_WEB_SERVER_COMMAND ?? "npm run start";
const reuseExistingServer = process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER === "true";
const localChromiumPath = "/usr/bin/chromium";
const executablePath =
  process.env.PLAYWRIGHT_EXECUTABLE_PATH ??
  (process.platform === "linux" && existsSync(localChromiumPath) ? localChromiumPath : undefined);

export default defineConfig({
  testDir: "./tests/e2e",
  // The PWA suite mutates network state and service-worker ownership on one local
  // origin. Running every scenario serially prevents cross-test state races while
  // retaining complete desktop and mobile coverage.
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL,
    trace: "retain-on-failure",
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  webServer: usesExternalBaseURL ? undefined : { command: webServerCommand, url: "http://127.0.0.1:3000", reuseExistingServer, timeout: 180_000 },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chrome", use: { ...devices["Pixel 7"] } },
  ],
});
