const path = require('path');
const {test, expect} = require('@playwright/test');
const {
  captureScreenshot,
  assertImagesLoaded,
  assertNoHorizontalOverflow
} = require('./screenshot-capture');

const repoRoot = path.resolve(__dirname, '../..');
const screenshotDir = path.join(repoRoot, '.agent/tasks/new-post-rich-text-e2e/screenshots');
const MOBILE_VIEWPORT = {width: 375, height: 667};
const DESKTOP_VIEWPORT = {width: 1280, height: 800};

async function saveShot(page, name) {
  await captureScreenshot(page, screenshotDir, name);
  await assertImagesLoaded(page);
  await assertNoHorizontalOverflow(page);
}

async function calls(page, type) {
  return page.evaluate((callType) => {
    const all = window.__NEW_POST_RICH_TEXT_E2E__.calls;
    return callType ? all.filter((item) => item.type === callType) : all;
  }, type);
}

test('new post composer publishes native rich text content (dual viewport)', async ({page, baseURL}) => {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await page.goto(`${baseURL}/#new-post-rich-text`);

  await expect(page.getByRole('heading', {name: 'New post rich text'})).toBeVisible();
  await expect.poll(async () => (await calls(page, 'getCanCreatePost')).length).toBe(1);

  const textInput = page.getByLabel('Post text');
  const publishButton = page.getByRole('button', {name: 'Publish post'});
  await expect(textInput).toBeVisible();
  await expect(page.getByRole('button', {name: 'Enter Text'})).toHaveCount(0);
  await expect(page.getByRole('button', {name: 'Upload new'})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Choose uploaded'})).toBeVisible();
  await expect(publishButton).toBeDisabled();

  await textInput.fill('Hello from native rich text\n\nSecond paragraph');
  await expect(publishButton).toBeEnabled();
  await saveShot(page, 'new-post-rich-text-mobile.png');

  await page.setViewportSize(DESKTOP_VIEWPORT);
  await expect(textInput).toHaveValue('Hello from native rich text\n\nSecond paragraph');
  await expect(publishButton).toBeEnabled();
  await saveShot(page, 'new-post-rich-text-desktop.png');

  await publishButton.click();
  await expect.poll(async () => (await calls(page, 'createPost')).length).toBe(1);

  const createCalls = await calls(page, 'createPost');
  expect(createCalls[0].postData).toMatchObject({
    groupId: 'test-channel',
    status: 'published',
    contents: [],
    contentRichTextFileName: 'post-rich-text.json',
    contentRichText: {
      type: 'geesome.richText',
      version: 1,
      blocks: [
        {
          type: 'paragraph',
          children: [{text: 'Hello from native rich text'}]
        },
        {
          type: 'paragraph',
          children: [{text: 'Second paragraph'}]
        }
      ],
      source: {ui: 'group:newPostControl'}
    }
  });
  await expect(textInput).toHaveValue('');
  await expect(publishButton).toBeDisabled();
});
