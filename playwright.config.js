const { defineConfig, devices } = require('@playwright/test');
require('./utils/env');

module.exports = defineConfig({
  testDir: './tests',
  globalSetup: './scripts/globalSetup.js',
  timeout: 180_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  reporter: [['./reporters/titleReporter.js'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL || 'https://dmoneyportal.roadtocareer.net',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
