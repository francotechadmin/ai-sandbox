import { defineConfig } from "@playwright/test";

// Runs the real UI against the real API with a scripted model (no API keys,
// no network). Locally: `npm run test:e2e`; set PYTHON to a venv's python and
// CHROMIUM_PATH to use an already-installed browser.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    launchOptions: { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] },
  },
  webServer: [
    {
      command: `${process.env.PYTHON ?? "python"} -m uvicorn api.tests.serve_fake:app --port 8000`,
      url: "http://127.0.0.1:8000/api/assistant/config",
      env: { ASSISTANT_FAKE_DELAY: "0.04", ANTHROPIC_API_KEY: "", OPENAI_API_KEY: "" },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "npm run dev",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
