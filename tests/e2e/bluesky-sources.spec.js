const path = require('path');
const {test, expect} = require('@playwright/test');
const {
  captureScreenshot,
  assertImagesLoaded,
  assertNoHorizontalOverflow
} = require('./screenshot-capture');

const repoRoot = path.resolve(__dirname, '../..');
const screenshotDir = path.join(repoRoot, '.agent/tasks/bluesky-sources-e2e/screenshots');
const MOBILE_VIEWPORT = {width: 375, height: 667};
const DESKTOP_VIEWPORT = {width: 1280, height: 800};

async function saveShot(page, name) {
  await captureScreenshot(page, screenshotDir, name);
  await assertImagesLoaded(page);
  await assertNoHorizontalOverflow(page);
}

async function calls(page, type) {
  return page.evaluate((callType) => {
    const all = window.__BLUESKY_SOURCES_E2E__.calls;
    return callType ? all.filter((item) => item.type === callType) : all;
  }, type);
}

test('Bluesky sources UI subscribes, refreshes, and reads native ATProto posts (dual viewport)', async ({page, baseURL}) => {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await page.goto(`${baseURL}/#bluesky-sources`);

  await expect(page.getByRole('heading', {name: 'Bluesky Sources'})).toBeVisible();
  await expect(page.locator('.activitypub-source-list-item').filter({hasText: '@bsky.app'})).toBeVisible();
  await expect(page.getByText('Native Bluesky launch')).toBeVisible();
  await expect(page.getByText('Native ATProto post imported into GeeSome.')).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Review queue'})).toBeVisible();
  await expect(page.getByText('Review-first Bluesky post waiting for import.')).toBeVisible();
  await expect(page.getByText('Quarantined Bluesky post waiting for admin decision.')).toBeVisible();
  await expect(page.getByRole('button', {name: 'Subscribe source'})).toBeVisible();

  await page.getByLabel('Rule value').fill('giveaway spam');
  await page.getByRole('button', {name: 'Add filter'}).click();
  await expect(page.getByText('block · keyword · text · giveaway spam')).toBeVisible();
  await saveShot(page, 'bluesky-sources-mobile.png');

  await page.getByRole('button', {name: 'Subscribe source'}).click();
  await expect(page.getByText('Subscribed @bsky.app')).toBeVisible();

  const subscribeCalls = await calls(page, 'adminSubscribeBlueskySource');
  expect(subscribeCalls[0].input).toMatchObject({
    actor: 'bsky.app',
    filter: 'posts_no_replies',
    groupName: 'bluesky-bsky-app',
    importLimit: 20,
    moderationMode: 'autoImport'
  });
  expect(subscribeCalls[0].input.moderationRules).toEqual(expect.arrayContaining([
    expect.objectContaining({type: 'keyword', field: 'text', action: 'block', value: 'giveaway spam'})
  ]));

  await page.getByRole('button', {name: 'Refresh from Bluesky'}).click();
  await expect(page.getByText('Fetched 2, imported 1')).toBeVisible();
  await expect.poll(async () => (await calls(page, 'adminRefreshBlueskySourceSubscription')).length).toBe(1);

  await page.setViewportSize(DESKTOP_VIEWPORT);
  await expect(page.getByText('https://bsky.app/profile/bsky.app/post/abc')).toBeVisible();
  await saveShot(page, 'bluesky-sources-desktop.png');

  await page.getByRole('button', {name: 'Import Review this Bluesky post'}).click();
  await expect(page.getByText('Imported 1 Bluesky review')).toBeVisible();
  await expect(page.getByText('Imported from review queue.')).toBeVisible();

  await page.getByRole('button', {name: 'Reject Quarantined Bluesky post'}).click();
  await expect(page.getByText('Marked Quarantined Bluesky post rejected')).toBeVisible();

  await page.getByRole('button', {name: 'Sync imported posts'}).click();
  await expect(page.getByText('Checked 1, updated 1, deleted 0')).toBeVisible();

  await page.getByRole('button', {name: 'Pause'}).click();
  await expect(page.getByText('paused').first()).toBeVisible();

  const listCalls = await calls(page, 'adminGetBlueskySourceSubscriptions');
  expect(listCalls[0].filters).toMatchObject({limit: 20, offset: 0});
  const feedCalls = await calls(page, 'adminGetBlueskySourceFeed');
  expect(feedCalls[0].filters).toMatchObject({limit: 20, offset: 0});
  const reviewCalls = await calls(page, 'adminGetBlueskySourceReviews');
  expect(reviewCalls[0].filters).toMatchObject({limit: 20, offset: 0});
  const importReviewCalls = await calls(page, 'adminImportBlueskySourceReview');
  expect(importReviewCalls[0]).toMatchObject({sourceId: 801, reviewId: 951, input: {}});
  const reviewStateCalls = await calls(page, 'adminUpdateBlueskySourceReviewState');
  expect(reviewStateCalls[0]).toMatchObject({sourceId: 801, reviewId: 952, input: {state: 'rejected'}});
  const syncCalls = await calls(page, 'adminSyncBlueskySourcePosts');
  expect(syncCalls[0].input).toMatchObject({limit: 20});
  const updateCalls = await calls(page, 'adminUpdateBlueskySourceSubscription');
  expect(updateCalls[0].input).toMatchObject({status: 'paused'});
});
