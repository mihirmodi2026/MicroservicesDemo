describe('User Login', () => {
  let testUser;

  before(() => {
    cy.waitForApiHealth();

    // Create a test user for login tests
    testUser = {
      email: `logintest_${Date.now()}@test.com`,
      password: 'LoginPass123!',
      confirmPassword: 'LoginPass123!',
      firstName: 'Login',
      lastName: 'Test',
    };

    cy.apiRegister(testUser);
  });

  it('should fail login for unverified email', () => {
    cy.apiLogin(testUser.email, testUser.password).then((response) => {
      expect(response.status).to.equal(401);
      expect(response.body.message).to.include('verify your email');
    });
  });

  it('should fail login with invalid credentials', () => {
    cy.apiLogin('nonexistent@test.com', 'wrongpassword').then((response) => {
      expect(response.status).to.equal(401);
      expect(response.body.message).to.include('Invalid email or password');
    });
  });

  it('should fail login with wrong password', () => {
    cy.apiLogin(testUser.email, 'WrongPassword123!').then((response) => {
      expect(response.status).to.equal(401);
      expect(response.body.message).to.include('Invalid email or password');
    });
  });
});
