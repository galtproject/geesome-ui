const path = require('path');
const {test, expect} = require('@playwright/test');
const {
  captureScreenshot,
  assertImagesLoaded,
  assertNoHorizontalOverflow
} = require('./screenshot-capture');

const repoRoot = path.resolve(__dirname, '../..');
const screenshotDir = path.join(repoRoot, '.agent/tasks/post-html-safety-e2e/screenshots');
const MOBILE_VIEWPORT = {width: 375, height: 667};
const DESKTOP_VIEWPORT = {width: 1280, height: 800};

async function saveShot(page, name) {
  await captureScreenshot(page, screenshotDir, name);
  await assertImagesLoaded(page);
  await assertNoHorizontalOverflow(page);
}

async function getPostHtml(page) {
  return page.locator('.post-card').evaluate((postCard) => postCard.innerHTML);
}

test('post component sanitizes rendered text html (dual viewport)', async ({page, baseURL}) => {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await page.goto(`${baseURL}/#post-html-safety`);

  await expect(page.getByRole('heading', {name: 'Post HTML safety'})).toBeVisible();
  await expect(page.getByText('Hello safe post')).toBeVisible();
  await expect(page.getByText('safe link')).toBeVisible();
  await expect(page.getByText('ipfs link')).toBeVisible();
  await expect(page.getByText('unstyled text')).toBeVisible();
  await expect(page.getByText('Rich hello formatted')).toBeVisible();
  await expect(page.getByText('safe rich link')).toBeVisible();
  await expect(page.getByText('unsafe rich link')).toBeVisible();
  await expect(page.getByText('quoted rich text')).toBeVisible();
  await expect(page.getByText('first rich item')).toBeVisible();
  await expect(page.locator('.post-card script')).toHaveCount(0);
  await expect(page.locator('.post-card iframe')).toHaveCount(0);

  let postHtml = await getPostHtml(page);
  expect(postHtml).not.toContain('onclick=');
  expect(postHtml).not.toContain('javascript:');
  expect(postHtml).not.toContain('style="color:red"');
  expect(postHtml).toContain('<strong>safe post</strong>');
  expect(postHtml).toContain('<strong>formatted</strong>');
  expect(postHtml).toMatch(/<a[^>]+href="https:\/\/example\.com\/safe"[^>]*>safe link<\/a>/);
  expect(postHtml).toMatch(/<a[^>]+href="ipfs:\/\/bafybeigdyrzt"[^>]*>ipfs link<\/a>/);
  expect(postHtml).toMatch(/<a[^>]+href="https:\/\/example\.com\/rich"[^>]*>safe rich link<\/a>/);
  expect(postHtml).not.toMatch(/<a[^>]*>unsafe rich link<\/a>/);
  await saveShot(page, 'post-html-safety-mobile.png');

  await page.setViewportSize(DESKTOP_VIEWPORT);
  await expect(page.getByText('Hello safe post')).toBeVisible();
  await expect(page.getByText('safe rich link')).toBeVisible();
  postHtml = await getPostHtml(page);
  expect(postHtml).not.toContain('window.__geesomePostXss');
  expect(postHtml).not.toContain('<iframe');
  await saveShot(page, 'post-html-safety-desktop.png');
});
