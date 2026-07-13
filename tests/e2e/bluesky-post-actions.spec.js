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

async function selectPolicyOption(page, fieldLabel, optionLabel) {
  const field = page.locator('.bluesky-cross-post-policy .md-field').filter({hasText: fieldLabel}).first();
  await field.click();
  await page.getByText(optionLabel, {exact: true}).last().click();
}

function policySelectValue(page, fieldLabel) {
  return page.locator('.bluesky-cross-post-policy .md-field')
    .filter({hasText: fieldLabel})
    .first()
    .locator('.md-select-value');
}

test('post detail Bluesky controls cross-post, update, and delete with selected account', async ({page, baseURL}) => {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await page.goto(`${baseURL}/#bluesky-post-actions`);

  await expect(page.getByRole('heading', {name: 'Bluesky post actions'})).toBeVisible();
  await expect(page.locator('.bluesky-cross-post-form > .md-field').first().locator('.md-select-value')).toHaveValue('@artist.bsky.social');
  await expect(page.getByLabel('App password')).toBeVisible();
  await expect(page.getByText('Reply and quote context is preserved')).toBeVisible();
  await expect(page.getByLabel('Bluesky cross-post policy')).not.toBeVisible();
  await expect(page.getByText('Advanced cross-post policy', {exact: true})).toBeVisible();
  await saveShot(page, 'bluesky-post-actions-default-mobile.png');
  await page.getByText('Advanced cross-post policy', {exact: true}).click();
  await expect(page.getByLabel('Bluesky cross-post policy')).toBeVisible();
  await expect(policySelectValue(page, 'Images')).toHaveValue('Upload blobs');
  await expect(policySelectValue(page, 'Upload failure')).toHaveValue('Use public link');
  await expect(policySelectValue(page, 'Attachments')).toHaveValue('External card');
  await expect(policySelectValue(page, 'Replies')).toHaveValue('Require Bluesky identity');
  await expect(page.getByRole('button', {name: 'Post to Bluesky'})).toBeDisabled();

  await page.getByLabel('App password').fill('app-password-123');
  await expect(page.getByRole('button', {name: 'Post to Bluesky'})).toBeEnabled();
  await saveShot(page, 'bluesky-post-actions-mobile.png');

  await page.setViewportSize(DESKTOP_VIEWPORT);
  await page.getByText('Advanced cross-post policy', {exact: true}).click();
  await expect(page.getByLabel('Bluesky cross-post policy')).not.toBeVisible();
  await saveShot(page, 'bluesky-post-actions-desktop.png');
  await page.getByText('Advanced cross-post policy', {exact: true}).click();

  await selectPolicyOption(page, 'Images', 'Public links');
  await selectPolicyOption(page, 'Upload failure', 'Reject post');
  await selectPolicyOption(page, 'Attachments', 'Links only');
  await selectPolicyOption(page, 'Link previews', 'Ignore previews');
  await selectPolicyOption(page, 'Replies', 'Omit reply metadata');
  await page.keyboard.press('Escape');
  await expect(policySelectValue(page, 'Images')).toHaveValue('Public links');
  await expect(policySelectValue(page, 'Upload failure')).toHaveValue('Reject post');
  await expect(policySelectValue(page, 'Attachments')).toHaveValue('Links only');
  await expect(policySelectValue(page, 'Link previews')).toHaveValue('Ignore previews');
  await expect(policySelectValue(page, 'Replies')).toHaveValue('Omit reply metadata');

  await page.getByRole('button', {name: 'Post to Bluesky'}).click();
  await expect(page.getByText('Posted to Bluesky')).toBeVisible();
  await expect(page.getByRole('link', {name: 'Open Bluesky post'})).toHaveAttribute(
    'href',
    'https://bsky.app/profile/artist.bsky.social/post/abc'
  );
  await expect(page.getByRole('button', {name: 'Update Bluesky'})).toBeVisible();

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
    input: {
      accountData: {id: 41},
      appPassword: 'app-password-123',
      mediaPolicy: {
        images: 'link',
        imageUploadFailure: 'reject',
        attachments: 'link',
        linkPreviews: 'ignore'
      },
      relationPolicy: {
        replies: 'omit',
        quotes: 'require'
      }
    }
  });
  const updateCalls = await calls(page, 'userBlueskyUpdateCrossPost');
  expect(updateCalls[0].input).toMatchObject({
    accountData: {id: 41},
    appPassword: 'app-password-123',
    mediaPolicy: {
      images: 'link',
      imageUploadFailure: 'reject',
      attachments: 'link',
      linkPreviews: 'ignore'
    },
    relationPolicy: {
      replies: 'omit',
      quotes: 'require'
    }
  });
  const deleteCalls = await calls(page, 'userBlueskyDeleteCrossPost');
  expect(deleteCalls[0].input).toMatchObject({accountData: {id: 41}, appPassword: 'app-password-123'});
  expect(deleteCalls[0].input.mediaPolicy).toBeUndefined();
  expect(deleteCalls[0].input.relationPolicy).toBeUndefined();
});
