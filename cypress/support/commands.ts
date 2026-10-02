/// <reference types="cypress" />

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      waitForEngine(): Chainable<void>;
    }
  }
}

Cypress.Commands.add("waitForEngine", () => {
  cy.get('[data-testid="engine-status"][data-state="Ready"]', { timeout: 90000 }).should("exist");
});

export {};
