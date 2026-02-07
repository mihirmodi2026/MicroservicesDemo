describe('Password Reset Flow', () => {
  let testUser;

  before(() => {
    cy.waitForApiHealth();

    testUser = {
      email: `pwreset_${Date.now()}@test.com`,
      password: 'OldPassword123!',
      confirmPassword: 'OldPassword123!',
      firstName: 'Password',
      lastName: 'Reset',
    };

    cy.apiRegister(testUser);
  });

  it('should initiate forgot password flow', () => {
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/api/auth/forgot-password`,
      body: { email: testUser.email },
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.message).to.include('If the email exists');
    });
  });

  it('should handle forgot password for non-existent email gracefully', () => {
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/api/auth/forgot-password`,
      body: { email: 'nonexistent@test.com' },
      failOnStatusCode: false,
    }).then((response) => {
      // Should return success to prevent email enumeration
      expect(response.status).to.equal(200);
      expect(response.body.message).to.include('If the email exists');
    });
  });

  it('should reject password reset with invalid token', () => {
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/api/auth/reset-password`,
      body: {
        token: 'invalid-token',
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      },
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.equal(400);
      expect(response.body.message).to.include('Invalid or expired');
    });
  });
});
