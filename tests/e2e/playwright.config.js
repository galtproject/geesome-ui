const path = require('path');
const {defineConfig} = require('@playwright/test');

const repoRoot = path.resolve(__dirname, '../..');
const frontendPort = Number(process.env.PLAYWRIGHT_TEST_FRONTEND_PORT || 4384);
const frontendOrigin = `http://127.0.0.1:${frontendPort}`;

module.exports = defineConfig({
  testDir: path.join(repoRoot, 'tests/e2e'),
  testMatch: '*.spec.js',
  timeout: 90000,
  retries: 0,
  workers: 1,
  use: {
    baseURL: frontendOrigin,
    browserName: 'chromium',
    channel: 'chrome',
    headless: true,
    viewport: {
      width: 375,
      height: 667
    }
  },
  webServer: {
    command: `npx parcel tests/e2e/pin-services.fixture.html --host 127.0.0.1 --port ${frontendPort} --dist-dir .agent/tasks/pin-services-e2e/dist --cache-dir .agent/tasks/pin-services-e2e/parcel-cache`,
    port: frontendPort,
    reuseExistingServer: false,
    cwd: repoRoot,
    timeout: 120000
  }
});
