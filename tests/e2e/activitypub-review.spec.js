const path = require('path');
const {test, expect} = require('@playwright/test');
const {
  captureScreenshot,
  assertImagesLoaded,
  assertNoHorizontalOverflow
} = require('./screenshot-capture');

const repoRoot = path.resolve(__dirname, '../..');
const screenshotDir = path.join(repoRoot, '.agent/tasks/activitypub-review-e2e/screenshots');
const MOBILE_VIEWPORT = {width: 375, height: 667};
const DESKTOP_VIEWPORT = {width: 1280, height: 800};

async function saveShot(page, name) {
  await captureScreenshot(page, screenshotDir, name);
  await assertImagesLoaded(page);
  await assertNoHorizontalOverflow(page);
}

async function calls(page, type) {
  return page.evaluate((callType) => {
    const all = window.__ACTIVITYPUB_REVIEW_E2E__.calls;
    return callType ? all.filter((item) => item.type === callType) : all;
  }, type);
}

test('ActivityPub review UI accepts remote objects and creates a backed-up post (dual viewport)', async ({page, baseURL}) => {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await page.goto(`${baseURL}/#activitypub`);

  await expect(page.getByRole('heading', {name: 'ActivityPub reviews'})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Remote reply'})).toBeVisible();
  await expect(page.getByText('Remote reply for review')).toBeVisible();
  await expect(page.getByText('Remote image')).toBeVisible();
  await expect(page.getByText('IPFS source')).toBeVisible();
  await expect(page.getByText('activitypub_remote_object_review_not_accepted')).toBeVisible();
  await saveShot(page, 'activitypub-review-mobile.png');

  await page.setViewportSize(DESKTOP_VIEWPORT);
  await expect(page.getByText('Default provenanceOnly; supported provenanceOnly, backupOnCreate')).toBeVisible();
  await saveShot(page, 'activitypub-review-desktop.png');

  await page.getByRole('button', {name: 'Accept', exact: true}).click();
  await expect(page.getByText('Ready to create')).toBeVisible();
  await page.getByText('Back up supported attachments').click();
  await page.getByRole('button', {name: 'Create post'}).click();
  await expect(page.getByText('Imported post #88')).toBeVisible();
  await saveShot(page, 'activitypub-review-created-desktop.png');

  const listCalls = await calls(page, 'adminGetActivityPubRemoteObjects');
  expect(listCalls[0].groupName).toBe('test-channel');
  expect(listCalls[0].filters).toMatchObject({reviewState: 'pending', limit: 20, offset: 0});

  const reviewCalls = await calls(page, 'adminSetActivityPubRemoteObjectReviewState');
  expect(reviewCalls[0]).toMatchObject({
    groupName: 'test-channel',
    remoteObjectId: 501,
    input: {state: 'accepted'}
  });

  const createCalls = await calls(page, 'adminCreateActivityPubRemoteObjectPost');
  expect(createCalls[0]).toMatchObject({
    groupName: 'test-channel',
    remoteObjectId: 501,
    options: {importRemoteAttachments: true}
  });
});
