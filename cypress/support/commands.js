// Custom command for API registration
Cypress.Commands.add('apiRegister', (userData) => {
  return cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/api/auth/register`,
    body: userData,
    failOnStatusCode: false,
  });
});

// Custom command for API login
Cypress.Commands.add('apiLogin', (email, password) => {
  return cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/api/auth/login`,
    body: { email, password },
    failOnStatusCode: false,
  });
});

// Custom command for authenticated API requests
Cypress.Commands.add('apiRequest', (options, userId) => {
  const headers = userId ? { 'X-User-Id': userId.toString() } : {};
  return cy.request({
    ...options,
    headers: { ...options.headers, ...headers },
    failOnStatusCode: false,
  });
});

// Custom command to wait for API health
Cypress.Commands.add('waitForApiHealth', (timeout = 30000) => {
  cy.request({
    method: 'GET',
    url: `${Cypress.env('apiUrl')}/health`,
    timeout: timeout,
    retryOnStatusCodeFailure: true,
  }).then((response) => {
    expect(response.status).to.equal(200);
  });
});

// Generate unique test data
Cypress.Commands.add('generateTestUser', (prefix = 'test') => {
  return {
    email: `${prefix}_${Date.now()}@test.com`,
    password: 'TestPassword123!',
    confirmPassword: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
  };
});

Cypress.Commands.add('generateTestProduct', (prefix = 'product') => {
  return {
    name: `${prefix}_${Date.now()}`,
    description: 'Test product description',
    price: Math.floor(Math.random() * 100) + 10,
    sku: `SKU-${Date.now()}`,
    stockQuantity: Math.floor(Math.random() * 100),
    category: 'Test Category',
  };
});
