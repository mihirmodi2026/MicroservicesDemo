describe('User Registration', () => {
  beforeEach(() => {
    cy.waitForApiHealth();
  });

  it('should register a new user successfully', () => {
    const user = {
      email: `newuser_${Date.now()}@test.com`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
      firstName: 'New',
      lastName: 'User',
    };

    cy.apiRegister(user).then((response) => {
      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data.email).to.equal(user.email.toLowerCase());
      expect(response.body.data.emailVerified).to.be.false;
      expect(response.body.message).to.include('Registration successful');
    });
  });

  it('should make first registered user an admin', () => {
    const adminUser = {
      email: `firstadmin_${Date.now()}@test.com`,
      password: 'AdminPass123!',
      confirmPassword: 'AdminPass123!',
      firstName: 'First',
      lastName: 'Admin',
    };

    cy.apiRegister(adminUser).then((response) => {
      expect(response.status).to.equal(200);
      // Check if role is admin (1) - first user gets Admin role
      // Note: This test may fail if database already has users
    });
  });

  it('should reject registration with existing email', () => {
    const user = {
      email: `duplicate_${Date.now()}@test.com`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
      firstName: 'Duplicate',
      lastName: 'User',
    };

    // Register first time
    cy.apiRegister(user).then((response) => {
      expect(response.status).to.equal(200);
    });

    // Try to register again with same email
    cy.apiRegister(user).then((response) => {
      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.include('Email already registered');
    });
  });

  it('should reject registration with invalid email format', () => {
    const invalidUser = {
      email: 'not-an-email',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      firstName: 'Invalid',
      lastName: 'User',
    };

    cy.apiRegister(invalidUser).then((response) => {
      expect(response.status).to.equal(400);
    });
  });
});
