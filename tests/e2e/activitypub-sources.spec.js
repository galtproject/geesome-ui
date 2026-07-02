const path = require('path');
const {test, expect} = require('@playwright/test');
const {
  captureScreenshot,
  assertImagesLoaded,
  assertNoHorizontalOverflow
} = require('./screenshot-capture');

const repoRoot = path.resolve(__dirname, '../..');
const screenshotDir = path.join(repoRoot, '.agent/tasks/activitypub-sources-e2e/screenshots');
const MOBILE_VIEWPORT = {width: 375, height: 667};
const DESKTOP_VIEWPORT = {width: 1280, height: 800};

async function saveShot(page, name) {
  await captureScreenshot(page, screenshotDir, name);
  await assertImagesLoaded(page);
  await assertNoHorizontalOverflow(page);
}

async function calls(page, type) {
  return page.evaluate((callType) => {
    const all = window.__ACTIVITYPUB_SOURCES_E2E__.calls;
    return callType ? all.filter((item) => item.type === callType) : all;
  }, type);
}

test('ActivityPub sources UI subscribes and reads a bridged Bluesky feed (dual viewport)', async ({page, baseURL}) => {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await page.goto(`${baseURL}/#activitypub-sources`);

  await expect(page.getByRole('heading', {name: 'ActivityPub Sources'})).toBeVisible();
  await expect(page.locator('.activitypub-source-list-item').filter({hasText: '@bsky.app via Bridgy Fed'})).toBeVisible();
  await expect(page.getByText('Bluesky update')).toBeVisible();
  await expect(page.getByText('A new official Bluesky post bridged into ActivityPub.')).toBeVisible();
  await expect(page.getByText('Launch image')).toBeVisible();
  await expect(page.getByRole('button', {name: 'Subscribe source'})).toBeVisible();
  await saveShot(page, 'activitypub-sources-mobile.png');

  await page.getByRole('button', {name: 'Subscribe source'}).click();
  await expect(page.getByText('Subscribed @bsky.app via Bridgy Fed')).toBeVisible();

  const subscribeCalls = await calls(page, 'adminSubscribeActivityPubSource');
  expect(subscribeCalls[0].input).toMatchObject({
    preset: 'bluesky-official',
    displayName: '@bsky.app via Bridgy Fed'
  });

  await page.setViewportSize(DESKTOP_VIEWPORT);
  await expect(page.getByText('https://bsky.app/profile/bsky.app/post/abc')).toBeVisible();
  await saveShot(page, 'activitypub-sources-desktop.png');

  await page.getByRole('button', {name: 'Mark read'}).click();
  await expect(page.getByText('Read 2026-06-02 12:30 UTC').first()).toBeVisible();
  await expect.poll(async () => (await calls(page, 'adminMarkActivityPubSourceRead')).length).toBe(1);

  await page.getByRole('button', {name: 'Pause'}).click();
  await expect(page.getByText('paused').first()).toBeVisible();

  const listCalls = await calls(page, 'adminGetActivityPubSourceSubscriptions');
  expect(listCalls[0].filters).toMatchObject({limit: 20, offset: 0});
  const feedCalls = await calls(page, 'adminGetActivityPubSourceFeed');
  expect(feedCalls[0].filters).toMatchObject({limit: 20, offset: 0});
  const updateCalls = await calls(page, 'adminUpdateActivityPubSourceSubscription');
  expect(updateCalls[0].input).toMatchObject({status: 'paused'});
});
