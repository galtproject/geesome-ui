const path = require('path');
const {test, expect} = require('@playwright/test');
const {
  captureScreenshot,
  assertImagesLoaded,
  assertNoHorizontalOverflow
} = require('./screenshot-capture');

const repoRoot = path.resolve(__dirname, '../..');
const screenshotDir = path.join(repoRoot, '.agent/tasks/bluesky-account-e2e/screenshots');
const MOBILE_VIEWPORT = {width: 375, height: 667};
const DESKTOP_VIEWPORT = {width: 1280, height: 800};

async function saveShot(page, name) {
  await captureScreenshot(page, screenshotDir, name);
  await assertImagesLoaded(page);
  await assertNoHorizontalOverflow(page);
}

async function calls(page, type) {
  return page.evaluate((callType) => {
    const all = window.__BLUESKY_ACCOUNT_E2E__.calls;
    return callType ? all.filter((item) => item.type === callType) : all;
  }, type);
}

function visibleBlueskyIdentifierInput(page) {
  return page.locator('input[name=bluesky_identifier]:visible');
}

function visibleBlueskyAppPasswordInput(page) {
  return page.locator('input[name=bluesky_app_password]:visible');
}

test('Bluesky account modal connects and verifies credentials without exposing secrets', async ({page, baseURL}) => {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await page.goto(`${baseURL}/#bluesky-account-connect`);

  await expect(page.getByRole('heading', {name: 'Bluesky account connect'})).toBeVisible();
  await expect(page.getByText('Use a Bluesky app password')).toBeVisible();
  await expect(page.getByText('Encrypt app password with API token')).toBeVisible();
  await expect(page.getByRole('button', {name: 'Connect Bluesky'})).toBeDisabled();

  await visibleBlueskyIdentifierInput(page).fill('newartist.bsky.social');
  await visibleBlueskyAppPasswordInput(page).fill('app-password-123');
  await expect(page.getByRole('button', {name: 'Connect Bluesky'})).toBeEnabled();
  await saveShot(page, 'bluesky-account-connect-mobile.png');

  await page.getByRole('button', {name: 'Connect Bluesky'}).click();
  await expect.poll(async () => (await calls(page, 'userBlueskyLogin')).length).toBe(1);
  const loginCalls = await calls(page, 'userBlueskyLogin');
  expect(loginCalls[0].input).toMatchObject({
    identifier: 'newartist.bsky.social',
    appPassword: 'app-password-123',
    encryptedApiKey: 'encrypted:app-password-123',
    isEncrypted: true
  });
  await expect.poll(async () => (await calls(page, 'asyncModalClose')).length).toBe(1);

  await page.setViewportSize(DESKTOP_VIEWPORT);
  await page.goto(`${baseURL}/?scenario=verify#bluesky-account-verify`);
  await expect(page.getByRole('heading', {name: 'Bluesky account verify'})).toBeVisible();
  await expect(visibleBlueskyIdentifierInput(page)).toHaveValue('artist.bsky.social');
  await expect(page.getByRole('button', {name: 'Verify'})).toBeDisabled();

  await visibleBlueskyAppPasswordInput(page).fill('verify-password-456');
  await expect(page.getByRole('button', {name: 'Verify'})).toBeEnabled();
  await saveShot(page, 'bluesky-account-verify-desktop.png');

  await page.getByRole('button', {name: 'Verify'}).click();
  await expect.poll(async () => (await calls(page, 'userBlueskyVerifyAccount')).length).toBe(1);
  const verifyCalls = await calls(page, 'userBlueskyVerifyAccount');
  expect(verifyCalls[0].input).toMatchObject({
    accountData: {
      id: 41,
      username: 'artist.bsky.social'
    },
    appPassword: 'verify-password-456'
  });
});
