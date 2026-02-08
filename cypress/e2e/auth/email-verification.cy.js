describe('Email Verification Flow', () => {
  beforeEach(() => {
    cy.waitForApiHealth();
  });

  it('should register user with emailVerified false', () => {
    const user = {
      email: `modidipika1948+verify_${Date.now()}@gmail.com`,
      password: 'VerifyPass123!',
      confirmPassword: 'VerifyPass123!',
      firstName: 'Verify',
      lastName: 'Test',
    };

    cy.apiRegister(user).then((response) => {
      expect(response.status).to.equal(200);
      expect(response.body.data.emailVerified).to.be.false;
    });
  });

  it('should reject invalid verification token', () => {
    cy.request({
      method: 'GET',
      url: `${Cypress.env('apiUrl')}/api/auth/verify-email?token=invalid-token`,
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.equal(400);
      expect(response.body.message).to.include('Invalid or expired');
    });
  });

  it('should handle resend verification request', () => {
    const user = {
      email: `modidipika1948+resend_${Date.now()}@gmail.com`,
      password: 'ResendPass123!',
      confirmPassword: 'ResendPass123!',
      firstName: 'Resend',
      lastName: 'Test',
    };

    // Register user
    cy.apiRegister(user).then(() => {
      // Request resend verification
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/api/auth/resend-verification`,
        body: { email: user.email },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(200);
        expect(response.body.success).to.be.true;
      });
    });
  });
});
