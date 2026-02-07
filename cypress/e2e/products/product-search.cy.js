describe('Product Search and Filtering', () => {
  const testCategory = `Category_${Date.now()}`;

  before(() => {
    cy.waitForApiHealth();

    // Create test products in the same category
    const products = [
      {
        name: `SearchProduct1_${Date.now()}`,
        description: 'Search Test 1',
        price: 10.0,
        sku: `SEARCH1-${Date.now()}`,
        stockQuantity: 10,
        category: testCategory,
      },
      {
        name: `SearchProduct2_${Date.now()}`,
        description: 'Search Test 2',
        price: 20.0,
        sku: `SEARCH2-${Date.now()}`,
        stockQuantity: 20,
        category: testCategory,
      },
    ];

    products.forEach((product) => {
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/api/products`,
        body: product,
      });
    });
  });

  it('should return all products', () => {
    cy.request({
      method: 'GET',
      url: `${Cypress.env('apiUrl')}/api/products`,
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.equal(200);
      expect(response.body.data).to.be.an('array');
      expect(response.body.data.length).to.be.greaterThan(0);
    });
  });

  it('should find products by category', () => {
    cy.request({
      method: 'GET',
      url: `${Cypress.env('apiUrl')}/api/products`,
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.equal(200);
      const categoryProducts = response.body.data.filter(
        (p) => p.category === testCategory
      );
      expect(categoryProducts.length).to.be.greaterThan(0);
    });
  });

  it('should handle empty search results gracefully', () => {
    cy.request({
      method: 'GET',
      url: `${Cypress.env('apiUrl')}/api/products/sku/NONEXISTENT-SKU-12345`,
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.equal(404);
    });
  });
});
