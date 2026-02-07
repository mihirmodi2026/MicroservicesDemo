// Import commands
import './commands';

// Global before hook
beforeEach(() => {
  cy.log('Starting new test...');
});

// Handle uncaught exceptions
Cypress.on('uncaught:exception', (err, runnable) => {
  console.log('Uncaught exception:', err.message);
  return false;
});
