describe('Permission-Based Access Control', () => {
  let adminUser;
  let regularUser;

  before(() => {
    cy.waitForApiHealth();

    // Create admin user (first user)
    const admin = {
      email: `permadmin_${Date.now()}@test.com`,
      password: 'AdminPass123!',
      confirmPassword: 'AdminPass123!',
      firstName: 'Permission',
      lastName: 'Admin',
    };

    cy.apiRegister(admin).then((response) => {
      adminUser = {
        ...admin,
        userId: response.body.data.userId,
        role: response.body.data.role,
      };
    });

    // Create regular user (second user)
    const regular = {
      email: `permuser_${Date.now()}@test.com`,
      password: 'UserPass123!',
      confirmPassword: 'UserPass123!',
      firstName: 'Regular',
      lastName: 'User',
    };

    cy.apiRegister(regular).then((response) => {
      regularUser = {
        ...regular,
        userId: response.body.data.userId,
        role: response.body.data.role,
      };
    });
  });

  it('should allow admin to view all users', () => {
    cy.apiRequest({
      method: 'GET',
      url: `${Cypress.env('apiUrl')}/api/users`,
    }, adminUser.userId).then((response) => {
      expect(response.status).to.equal(200);
      expect(response.body.data).to.be.an('array');
    });
  });

  it('should deny regular user from viewing all users without permission', () => {
    cy.apiRequest({
      method: 'GET',
      url: `${Cypress.env('apiUrl')}/api/users`,
    }, regularUser.userId).then((response) => {
      expect(response.status).to.equal(401);
    });
  });

  it('should allow user to view their own profile', () => {
    cy.apiRequest({
      method: 'GET',
      url: `${Cypress.env('apiUrl')}/api/users/${regularUser.userId}`,
    }, regularUser.userId).then((response) => {
      expect(response.status).to.equal(200);
      expect(response.body.data.id).to.equal(regularUser.userId);
    });
  });

  it('should deny non-admin from updating permissions', () => {
    cy.apiRequest({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/api/auth/update-permissions`,
      body: {
        userId: adminUser.userId,
        permissions: 63,
      },
    }, regularUser.userId).then((response) => {
      expect(response.status).to.equal(401);
      expect(response.body.message).to.include('Admin access required');
    });
  });
});
