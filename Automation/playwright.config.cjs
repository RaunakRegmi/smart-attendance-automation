const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 300000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report' }]
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5001',
    extraHTTPHeaders: { 'Content-Type': 'application/json' },
  },
  projects: [
    {
      name: 'setup',
      testMatch: '**/setup.spec.js',
    },
    {
      name: 'chromium',
      testIgnore: '**/setup.spec.js',
      use: { browserName: 'chromium' },
    },
    {
      name: 'firefox',
      testIgnore: '**/setup.spec.js',
      use: { browserName: 'firefox' },
    },
  ],
});
