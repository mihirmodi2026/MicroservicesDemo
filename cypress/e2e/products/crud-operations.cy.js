describe('Product CRUD Operations', () => {
  beforeEach(() => {
    cy.waitForApiHealth();
  });

  it('should create a new product', () => {
    const product = {
      name: `TestProduct_${Date.now()}`,
      description: 'E2E Test Product',
      price: 49.99,
      sku: `SKU-${Date.now()}`,
      stockQuantity: 50,
      category: 'Testing',
    };

    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/api/products`,
      body: product,
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.equal(201);
      expect(response.body.success).to.be.true;
      expect(response.body.data.name).to.equal(product.name);
      expect(response.body.data.sku).to.equal(product.sku);
      expect(response.body.data.price).to.equal(product.price);
    });
  });

  it('should retrieve all products', () => {
    cy.request({
      method: 'GET',
      url: `${Cypress.env('apiUrl')}/api/products`,
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.be.an('array');
    });
  });

  it('should retrieve a product by ID', () => {
    const product = {
      name: `GetById_${Date.now()}`,
      description: 'Test',
      price: 19.99,
      sku: `GETID-${Date.now()}`,
      stockQuantity: 10,
      category: 'Test',
    };

    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/api/products`,
      body: product,
    }).then((createResponse) => {
      const productId = createResponse.body.data.id;

      cy.request({
        method: 'GET',
        url: `${Cypress.env('apiUrl')}/api/products/${productId}`,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(200);
        expect(response.body.data.id).to.equal(productId);
        expect(response.body.data.name).to.equal(product.name);
      });
    });
  });

  it('should retrieve a product by SKU', () => {
    const sku = `SKUTEST-${Date.now()}`;
    const product = {
      name: `SKUProduct_${Date.now()}`,
      description: 'SKU Test',
      price: 29.99,
      sku: sku,
      stockQuantity: 20,
      category: 'Test',
    };

    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/api/products`,
      body: product,
    }).then(() => {
      cy.request({
        method: 'GET',
        url: `${Cypress.env('apiUrl')}/api/products/sku/${sku}`,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(200);
        expect(response.body.data.sku).to.equal(sku);
      });
    });
  });

  it('should update a product', () => {
    const product = {
      name: `ToUpdate_${Date.now()}`,
      description: 'Original',
      price: 9.99,
      sku: `UPDATE-${Date.now()}`,
      stockQuantity: 5,
      category: 'Test',
    };

    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/api/products`,
      body: product,
    }).then((createResponse) => {
      const productId = createResponse.body.data.id;

      const updateData = {
        name: 'Updated Product Name',
        price: 19.99,
        description: 'Updated description',
      };

      cy.request({
        method: 'PUT',
        url: `${Cypress.env('apiUrl')}/api/products/${productId}`,
        body: updateData,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(200);
        expect(response.body.data.name).to.equal(updateData.name);
        expect(response.body.data.price).to.equal(updateData.price);
      });
    });
  });

  it('should update product stock', () => {
    const product = {
      name: `StockUpdate_${Date.now()}`,
      description: 'Stock Test',
      price: 14.99,
      sku: `STOCK-${Date.now()}`,
      stockQuantity: 100,
      category: 'Test',
    };

    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/api/products`,
      body: product,
    }).then((createResponse) => {
      const productId = createResponse.body.data.id;
      const newStock = 75;

      cy.request({
        method: 'PATCH',
        url: `${Cypress.env('apiUrl')}/api/products/${productId}/stock`,
        body: JSON.stringify(newStock),
        headers: {
          'Content-Type': 'application/json',
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(200);
        expect(response.body.data.stockQuantity).to.equal(newStock);
      });
    });
  });

  it('should delete a product', () => {
    const product = {
      name: `ToDelete_${Date.now()}`,
      description: 'Delete Test',
      price: 4.99,
      sku: `DELETE-${Date.now()}`,
      stockQuantity: 1,
      category: 'Test',
    };

    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/api/products`,
      body: product,
    }).then((createResponse) => {
      const productId = createResponse.body.data.id;

      cy.request({
        method: 'DELETE',
        url: `${Cypress.env('apiUrl')}/api/products/${productId}`,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(200);
        expect(response.body.success).to.be.true;

        // Verify product is gone
        cy.request({
          method: 'GET',
          url: `${Cypress.env('apiUrl')}/api/products/${productId}`,
          failOnStatusCode: false,
        }).then((getResponse) => {
          expect(getResponse.status).to.equal(404);
        });
      });
    });
  });

  it('should reject duplicate SKU', () => {
    const sku = `DUPE-${Date.now()}`;
    const product1 = {
      name: 'First Product',
      description: 'First',
      price: 9.99,
      sku: sku,
      stockQuantity: 10,
      category: 'Test',
    };

    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/api/products`,
      body: product1,
    }).then(() => {
      const product2 = {
        name: 'Second Product',
        description: 'Second',
        price: 19.99,
        sku: sku,
        stockQuantity: 20,
        category: 'Test',
      };

      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/api/products`,
        body: product2,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(400);
        expect(response.body.message).to.include('SKU already exists');
      });
    });
  });

  it('should return 404 for non-existent product', () => {
    cy.request({
      method: 'GET',
      url: `${Cypress.env('apiUrl')}/api/products/999999`,
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.equal(404);
    });
  });
});
