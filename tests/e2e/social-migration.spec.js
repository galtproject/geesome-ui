const path = require('path');
const {test, expect} = require('@playwright/test');
const {
  captureScreenshot,
  assertImagesLoaded,
  assertNoHorizontalOverflow
} = require('./screenshot-capture');

const repoRoot = path.resolve(__dirname, '../..');
const screenshotDir = path.join(repoRoot, '.agent/tasks/social-migration-e2e/screenshots');
const MOBILE_VIEWPORT = {width: 375, height: 667};
const DESKTOP_VIEWPORT = {width: 1280, height: 800};

async function saveShot(page, name) {
  await captureScreenshot(page, screenshotDir, name);
  await assertImagesLoaded(page);
  await assertNoHorizontalOverflow(page);
}

async function calls(page, type) {
  return page.evaluate((callType) => {
    const all = window.__SOCIAL_MIGRATION_E2E__.calls;
    return callType ? all.filter((item) => item.type === callType) : all;
  }, type);
}

async function selectMaterialOption(page, fieldLabel, optionText) {
  const field = page.locator('.social-migration-page .md-field').filter({hasText: fieldLabel}).first();
  await field.locator('.md-select').click();
  await page.getByText(optionText, {exact: true}).last().click();
}

function fieldInput(page, fieldLabel) {
  return page.locator('.social-migration-page .md-field')
    .filter({hasText: fieldLabel})
    .locator('input')
    .first();
}

test('social migration previews and imports Bluesky and ActivityPub accounts (dual viewport)', async ({page, baseURL}) => {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await page.goto(`${baseURL}/#social-migration`);

  await expect(page.getByRole('heading', {name: 'Social Migration'})).toBeVisible();
  await expect(page.getByLabel('Bluesky handle or DID')).toHaveValue('bsky.app');
  await expect(
    page.locator('.social-migration-page .md-field')
      .filter({hasText: 'Stored Bluesky account'})
      .locator('input')
      .first()
  ).toHaveValue('@artist.bsky.social');
  await expect(page.getByRole('button', {name: 'Preview migration'})).toBeEnabled();

  await page.getByRole('button', {name: 'Preview migration'}).click();
  await expect(page.getByText('Bluesky migration root')).toBeVisible();
  await expect(page.getByText('Own Bluesky post ready for GeeSome.')).toBeVisible();
  await expect(page.getByText('Ownership verified: storedAccount')).toBeVisible();
  await saveShot(page, 'social-migration-bluesky-mobile.png');

  await page.getByRole('button', {name: 'Start import'}).click();
  await expect(page.getByText('Queued bluesky-migration-import #77')).toBeVisible();

  const blueskyPreviewCalls = await calls(page, 'userBlueskyMigrationPreview');
  expect(blueskyPreviewCalls[0].input).toMatchObject({
    actor: 'bsky.app',
    claimed: true,
    accountData: {
      id: 41,
      accountId: 'did:plc:artist',
      username: 'artist.bsky.social'
    },
    filter: 'posts_with_replies',
    limit: 10
  });
  const blueskyImportCalls = await calls(page, 'userBlueskyMigrationImport');
  expect(blueskyImportCalls[0].input).toMatchObject({
    groupName: 'migrated-social-page',
    async: true,
    maxPages: 2,
    moderationPolicy: {mode: 'autoImport'}
  });

  await page.setViewportSize(DESKTOP_VIEWPORT);
  await selectMaterialOption(page, 'Source type', 'ActivityPub');
  await fieldInput(page, 'Handle, URL, or resource').fill('alice@example.com');
  await fieldInput(page, 'Ownership proof token').fill('geesome-proof:e2e-profile-token');
  await page.getByRole('button', {name: 'Preview migration'}).click();
  await expect(page.getByText('ActivityPub migration root')).toBeVisible();
  await expect(page.getByText('Own ActivityPub post ready for GeeSome.')).toBeVisible();
  await expect(page.getByText('Ownership verified: profileToken')).toBeVisible();
  await saveShot(page, 'social-migration-activitypub-desktop.png');

  await page.getByRole('button', {name: 'Start import'}).click();
  await expect(page.getByText('Queued activitypub-migration-import #78')).toBeVisible();

  const activityPubPreviewCalls = await calls(page, 'userActivityPubMigrationPreview');
  expect(activityPubPreviewCalls[0].input).toMatchObject({
    handle: 'alice@example.com',
    claimed: true,
    ownershipProofToken: 'geesome-proof:e2e-profile-token',
    limit: 10,
    maxPages: 2
  });
  const activityPubImportCalls = await calls(page, 'userActivityPubMigrationImport');
  expect(activityPubImportCalls[0].input).toMatchObject({
    createPosts: true,
    groupName: 'migrated-social-page',
    async: true,
    moderationPolicy: {mode: 'autoImport'}
  });
});
