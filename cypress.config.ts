import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:4173",
    specPattern: "cypress/e2e/**/*.cy.ts",
    supportFile: "cypress/support/e2e.ts",
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10_000,
    requestTimeout: 15_000,
    viewportWidth: 1440,
    viewportHeight: 900,
  },
});
