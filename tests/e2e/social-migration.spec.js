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
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
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
  await materialField(page, fieldLabel).locator('.md-select').click();
  await page.getByText(optionText, {exact: true}).last().click();
}

function fieldInput(page, fieldLabel) {
  return materialField(page, fieldLabel).locator('input').first();
}

function materialField(page, fieldLabel) {
  return page.locator(
    `xpath=//*[@id="social-migration-page"]//*[contains(concat(" ", normalize-space(@class), " "), " md-field ")][.//label[normalize-space(.)="${fieldLabel}"]]`
  ).first();
}

async function addMigrationFilter(page, value, options = {}) {
  if (options.type) {
    await selectMaterialOption(page, 'Type', options.type);
  }
  if (options.field) {
    await selectMaterialOption(page, 'Field', options.field);
  }
  if (options.action) {
    await selectMaterialOption(page, 'Action', options.action);
  }

  await fieldInput(page, 'Filter value').fill(value);
  await page.getByRole('button', {name: 'Add filter'}).click();
}

function materialCheckbox(page, label) {
  return page.locator(
    `xpath=//*[@id="social-migration-page"]//*[contains(concat(" ", normalize-space(@class), " "), " md-checkbox ")][normalize-space(.)="${label}"]`
  ).first();
}

async function setMigrationPolicy(page) {
  await selectMaterialOption(page, 'Images', 'Ignore');
  await selectMaterialOption(page, 'Link previews', 'Reject');
  await selectMaterialOption(page, 'Unsupported embeds', 'Ignore');
  await selectMaterialOption(page, 'Replies', 'Omit');
  await selectMaterialOption(page, 'Quotes', 'Reject');
  await selectMaterialOption(page, 'Reposts', 'Omit');
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
  await expect(page.getByLabel('Migration import policy')).toBeVisible();
  await setMigrationPolicy(page);
  await expect(page.getByText('Policy: images ignore · links reject · embeds ignore · replies omit · quotes reject · reposts omit')).toBeVisible();

  await addMigrationFilter(page, 'giveaway spam');
  await expect(page.getByText('block · keyword · text · giveaway spam')).toBeVisible();
  await addMigrationFilter(page, '^(spam|casino)', {
    type: 'Regex',
    field: 'Group name',
    action: 'Quarantine'
  });
  await expect(page.getByText('quarantine · regex · groupName · ^(spam|casino)')).toBeVisible();

  await page.getByRole('button', {name: 'Preview migration'}).click();
  await expect(page.getByText('Bluesky migration root')).toBeVisible();
  await expect(page.getByText('Own Bluesky post ready for GeeSome.')).toBeVisible();
  await expect(page.getByText('Ownership verified: storedAccount')).toBeVisible();
  await saveShot(page, 'social-migration-bluesky-mobile.png');

  await page.getByRole('button', {name: 'Start import'}).click();
  await expect(page.getByText('Queued bluesky-migration-import #77')).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Relation reconciliation'})).toBeVisible();
  await fieldInput(page, 'Source channel').fill('did:plc:bsky');
  await page.getByRole('button', {name: 'Reconcile relations'}).click();
  await expect(page.getByText('Relation dry run checked 4 posts')).toBeVisible();
  await expect(page.getByText('permission-blocked').first()).toBeVisible();
  await expect(page.getByText('ambiguous').first()).toBeVisible();
  await expect(page.getByText('Next cursor 2026-07-04T08:00:00.000Z / 104')).toBeVisible();
  await page.getByRole('button', {name: 'Continue next page'}).click();
  await expect(fieldInput(page, 'Cursor id')).toHaveValue('104');
  await saveShot(page, 'social-migration-bluesky-reconcile-mobile.png');

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
    maxPages: 2
  });
  expect(blueskyImportCalls[0].input.moderationPolicy).toMatchObject({mode: 'autoImport'});
  expect(blueskyImportCalls[0].input.mediaPolicy).toEqual({
    images: 'ignore',
    linkPreviews: 'reject',
    unsupportedEmbeds: 'ignore'
  });
  expect(blueskyImportCalls[0].input.relationPolicy).toEqual({
    replies: 'omit',
    quotes: 'reject',
    reposts: 'omit'
  });
  expect(blueskyImportCalls[0].input.moderationPolicy.rules).toEqual(expect.arrayContaining([
    expect.objectContaining({type: 'keyword', field: 'text', action: 'block', value: 'giveaway spam'}),
    expect.objectContaining({type: 'regex', field: 'groupName', action: 'quarantine', value: '^(spam|casino)'})
  ]));
  const blueskyReconcileCalls = await calls(page, 'userBlueskyMigrationReconcileRelations');
  expect(blueskyReconcileCalls[0].input).toMatchObject({
    groupName: 'migrated-social-page',
    sourceChannelId: 'did:plc:bsky',
    limit: 20,
    dryRun: true,
    allowCrossGroup: true,
    force: false
  });
  expect(blueskyReconcileCalls[1].input).toMatchObject({
    cursorPublishedAt: '2026-07-04T08:00:00.000Z',
    cursorId: 104
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
  await materialCheckbox(page, 'Dry run').locator('.md-checkbox-container').click();
  await expect(materialCheckbox(page, 'Dry run')).not.toHaveClass(/md-checked/);
  await materialCheckbox(page, 'Allow cross-group targets').locator('.md-checkbox-container').click();
  await expect(materialCheckbox(page, 'Allow cross-group targets')).not.toHaveClass(/md-checked/);
  await materialCheckbox(page, 'Recompute existing').locator('.md-checkbox-container').click();
  await expect(materialCheckbox(page, 'Recompute existing')).toHaveClass(/md-checked/);
  await fieldInput(page, 'Source channel').fill('remoteActor:501');
  await page.getByRole('button', {name: 'Reconcile relations'}).click();
  await expect(page.getByText('Reconciled 1 post relations')).toBeVisible();
  await expect(page.getByText('already-linked').first()).toBeVisible();
  await saveShot(page, 'social-migration-activitypub-reconcile-desktop.png');

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
    async: true
  });
  expect(activityPubImportCalls[0].input.moderationPolicy).toMatchObject({mode: 'autoImport'});
  expect(activityPubImportCalls[0].input.mediaPolicy).toEqual({
    images: 'ignore',
    linkPreviews: 'reject',
    unsupportedEmbeds: 'ignore'
  });
  expect(activityPubImportCalls[0].input.relationPolicy).toEqual({
    replies: 'omit',
    quotes: 'reject',
    reposts: 'omit'
  });
  expect(activityPubImportCalls[0].input.moderationPolicy.rules).toEqual(expect.arrayContaining([
    expect.objectContaining({type: 'keyword', field: 'text', action: 'block', value: 'giveaway spam'}),
    expect.objectContaining({type: 'regex', field: 'groupName', action: 'quarantine', value: '^(spam|casino)'})
  ]));
  const activityPubReconcileCalls = await calls(page, 'userActivityPubMigrationReconcileRelations');
  expect(activityPubReconcileCalls[0].input).toMatchObject({
    groupName: 'migrated-social-page',
    sourceChannelId: 'remoteActor:501',
    limit: 20,
    dryRun: false,
    allowCrossGroup: false,
    force: true
  });
});
