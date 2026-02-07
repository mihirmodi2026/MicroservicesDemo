const { defineConfig } = require('cypress');

// Default to K8s NodePort, can be overridden with CYPRESS_BASE_URL env var
const baseUrl = process.env.CYPRESS_BASE_URL || 'http://localhost:30000';

module.exports = defineConfig({
  e2e: {
    baseUrl: baseUrl,
    specPattern: 'e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'support/e2e.js',
    fixturesFolder: 'fixtures',
    screenshotsFolder: 'screenshots',
    videosFolder: 'videos',
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 30000,
    video: true,
    screenshotOnRunFailure: true,
    retries: {
      runMode: 2,
      openMode: 0,
    },
    env: {
      apiUrl: baseUrl,
    },
  },
});
