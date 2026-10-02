describe("Smoke test", () => {
  it("loads the application shell and checks title", () => {
    cy.visit("/");
    cy.contains("V-Lab ECE").should("be.visible");
  });
});
