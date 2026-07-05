const path = require('path');
const {test, expect} = require('@playwright/test');
const {
  captureScreenshot,
  assertImagesLoaded,
  assertNoHorizontalOverflow
} = require('./screenshot-capture');

const repoRoot = path.resolve(__dirname, '../..');
const screenshotDir = path.join(repoRoot, '.agent/tasks/bluesky-post-actions-e2e/screenshots');
const MOBILE_VIEWPORT = {width: 375, height: 667};
const DESKTOP_VIEWPORT = {width: 1280, height: 800};

async function saveShot(page, name) {
  await captureScreenshot(page, screenshotDir, name);
  await assertImagesLoaded(page);
  await assertNoHorizontalOverflow(page);
}

async function calls(page, type) {
  return page.evaluate((callType) => {
    const all = window.__BLUESKY_POST_ACTIONS_E2E__.calls;
    return callType ? all.filter((item) => item.type === callType) : all;
  }, type);
}

test('post detail Bluesky controls cross-post, update, and delete with selected account', async ({page, baseURL}) => {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await page.goto(`${baseURL}/#bluesky-post-actions`);

  await expect(page.getByRole('heading', {name: 'Bluesky post actions'})).toBeVisible();
  await expect(page.locator('.bluesky-cross-post-form .md-select-value')).toHaveValue('@artist.bsky.social');
  await expect(page.getByLabel('App password')).toBeVisible();
  await expect(page.getByText('Reply and quote context is preserved')).toBeVisible();
  await expect(page.getByRole('button', {name: 'Post to Bluesky'})).toBeDisabled();

  await page.getByLabel('App password').fill('app-password-123');
  await expect(page.getByRole('button', {name: 'Post to Bluesky'})).toBeEnabled();
  await saveShot(page, 'bluesky-post-actions-mobile.png');

  await page.getByRole('button', {name: 'Post to Bluesky'}).click();
  await expect(page.getByText('Posted to Bluesky')).toBeVisible();
  await expect(page.getByRole('link', {name: 'Open Bluesky post'})).toHaveAttribute(
    'href',
    'https://bsky.app/profile/artist.bsky.social/post/abc'
  );
  await expect(page.getByRole('button', {name: 'Update Bluesky'})).toBeVisible();

  await page.setViewportSize(DESKTOP_VIEWPORT);
  await saveShot(page, 'bluesky-post-actions-desktop.png');

  await page.getByRole('button', {name: 'Update Bluesky'}).click();
  await expect(page.getByText('Updated Bluesky post')).toBeVisible();

  await page.getByRole('button', {name: 'Delete Bluesky'}).click();
  await expect(page.getByText('Deleted Bluesky post')).toBeVisible();
  await expect(page.getByRole('button', {name: 'Post to Bluesky'})).toBeVisible();

  const listCalls = await calls(page, 'socNetDbAccountList');
  expect(listCalls[0].params).toMatchObject({socNet: 'bluesky'});
  const createCalls = await calls(page, 'userBlueskyCrossPost');
  expect(createCalls[0]).toMatchObject({
    postId: 8,
    input: {accountData: {id: 41}, appPassword: 'app-password-123'}
  });
  const updateCalls = await calls(page, 'userBlueskyUpdateCrossPost');
  expect(updateCalls[0].input).toMatchObject({accountData: {id: 41}, appPassword: 'app-password-123'});
  const deleteCalls = await calls(page, 'userBlueskyDeleteCrossPost');
  expect(deleteCalls[0].input).toMatchObject({accountData: {id: 41}, appPassword: 'app-password-123'});
});
