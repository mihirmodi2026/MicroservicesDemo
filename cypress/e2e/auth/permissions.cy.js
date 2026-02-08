describe('Permission-Based Access Control', () => {
  let adminUser;
  let regularUser;

  before(() => {
    cy.waitForApiHealth();

    // Create first user for testing
    const user1 = {
      email: `modidipika1948+permadmin_${Date.now()}@gmail.com`,
      password: 'AdminPass123!',
      confirmPassword: 'AdminPass123!',
      firstName: 'Permission',
      lastName: 'Admin',
    };

    cy.apiRegister(user1).then((response) => {
      adminUser = {
        ...user1,
        userId: response.body.data.userId,
        role: response.body.data.role,
        isAdmin: response.body.data.role === 'Admin',
      };
    });

    // Create regular user (second user)
    const regular = {
      email: `modidipika1948+permuser_${Date.now()}@gmail.com`,
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

  it('should test admin access to view all users (or deny if not admin)', () => {
    cy.apiRequest({
      method: 'GET',
      url: `${Cypress.env('apiUrl')}/api/users`,
    }, adminUser.userId).then((response) => {
      // If user is admin, should get 200; otherwise 401
      if (adminUser.isAdmin) {
        expect(response.status).to.equal(200);
        expect(response.body.data).to.be.an('array');
      } else {
        // User is not admin, so access should be denied
        expect(response.status).to.equal(401);
      }
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
