const path = require('path');
const {test, expect} = require('@playwright/test');
const {
  captureScreenshot,
  assertImagesLoaded,
  assertNoHorizontalOverflow
} = require('./screenshot-capture');

const repoRoot = path.resolve(__dirname, '../..');
const screenshotDir = path.join(repoRoot, '.agent/tasks/storage-space-e2e/screenshots');
const MOBILE_VIEWPORT = {width: 375, height: 667};
const DESKTOP_VIEWPORT = {width: 1280, height: 800};

async function saveShot(page, name) {
  await captureScreenshot(page, screenshotDir, name);
  await assertImagesLoaded(page);
  await assertNoHorizontalOverflow(page);
}

async function calls(page, type) {
  return page.evaluate((callType) => {
    const all = window.__STORAGE_SPACE_E2E__.calls;
    return callType ? all.filter((item) => item.type === callType) : all;
  }, type);
}

test('storage space UI summarizes usage and switches drilldown tables (dual viewport)', async ({page, baseURL}) => {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await page.goto(`${baseURL}/#storage-space`);

  await expect(page.getByText('Storage space', {exact: true})).toBeVisible();
  await expect(page.getByText('Logical content')).toBeVisible();
  await expect(page.getByText('Physical content')).toBeVisible();
  await expect(page.getByText('Shared savings')).toBeVisible();
  await expect(page.getByText('4.5 KB')).toBeVisible();
  await expect(page.getByText('poster.png')).toBeVisible();
  await saveShot(page, 'storage-space-mobile.png');

  await page.setViewportSize(DESKTOP_VIEWPORT);
  await expect(page.getByText('Largest files')).toBeVisible();
  await expect(page.getByText('bafy-content-poster')).toBeVisible();
  await saveShot(page, 'storage-space-desktop.png');

  await page.locator('.md-tabs-navigation').getByText('Catalog files').click();
  await expect(page.getByText('archive.zip')).toBeVisible();
  await saveShot(page, 'storage-space-catalog-desktop.png');

  await page.locator('.md-tabs-navigation').getByText('Groups').click();
  await expect(page.getByText('Test Channel')).toBeVisible();

  await page.locator('.md-tabs-navigation').getByText('File types').click();
  await expect(page.getByText('image/png / png')).toBeVisible();

  await page.getByRole('button', {name: 'Refresh storage analysis'}).click();
  await expect.poll(async () => (await calls(page, 'adminGetStorageSpaceOverview')).length).toBe(2);

  const topContentCalls = await calls(page, 'adminGetStorageSpaceTopContents');
  expect(topContentCalls[0].listParams).toMatchObject({limit: 20, offset: 0});
});
