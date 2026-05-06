const path = require('path');
const {test, expect} = require('@playwright/test');
const {
  captureScreenshot,
  assertImagesLoaded,
  assertNoHorizontalOverflow
} = require('./screenshot-capture');

const repoRoot = path.resolve(__dirname, '../..');
const screenshotDir = path.join(repoRoot, '.agent/tasks/pin-services-e2e/screenshots');
const MOBILE_VIEWPORT = {width: 375, height: 667};
const DESKTOP_VIEWPORT = {width: 1280, height: 800};

async function saveShot(page, name) {
  await captureScreenshot(page, screenshotDir, name);
  await assertImagesLoaded(page);
  await assertNoHorizontalOverflow(page);
}

async function calls(page, type) {
  return page.evaluate((callType) => {
    const all = window.__PIN_SERVICES_E2E__.calls;
    return callType ? all.filter((item) => item.type === callType) : all;
  }, type);
}

test('pin services UI configures accounts and pins uploaded content (dual viewport)', async ({page, baseURL}) => {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await page.goto(baseURL);

  await expect(page.getByRole('heading', {name: 'Pin services'})).toBeVisible();
  await expect(page.getByText('pinata-main', {exact: true})).toBeVisible();
  await expect(page.getByText('Default Pinata endpoint')).toBeVisible();
  await expect(page.getByText('Pin uploaded content')).toBeVisible();
  await expect(page.getByRole('button', {name: 'Pin uploaded content'})).toBeDisabled();
  await saveShot(page, 'pin-services-mobile.png');

  await page.setViewportSize(DESKTOP_VIEWPORT);
  await expect(page.getByRole('button', {name: 'Delete pin service pinata-main'})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Edit pin service pinata-main'})).toBeVisible();
  await saveShot(page, 'pin-services-desktop.png');

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', {name: 'Delete pin service pinata-main'}).click();
  await expect.poll(async () => (await calls(page, 'deletePinAccount')).length).toBe(1);

  await page.getByText('Upload new').click();
  await page.locator('input[type=file]').setInputFiles({
    name: 'pin-source.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('pin me')
  });

  const storageInput = page.locator('input[placeholder="CID from an uploaded Geesome file"]');
  await expect(storageInput).toHaveValue('bafy-pin-services-upload');
  await expect(page.getByText('Uploaded content #77')).toBeVisible();
  await expect(page.getByRole('button', {name: 'Pin uploaded content'})).toBeEnabled();
  await page.getByRole('button', {name: 'Pin uploaded content'}).click();

  await expect.poll(async () => (await calls(page, 'pinContentByUserAccount')).length).toBe(1);
  const pinCalls = await calls(page, 'pinContentByUserAccount');
  expect(pinCalls[0]).toMatchObject({
    accountName: 'pinata-main',
    storageId: 'bafy-pin-services-upload',
    options: {
      source: 'geesome-ui',
      contentDbId: 77
    }
  });
  await expect(page.getByText('Last pin status: 200 OK')).toBeVisible();
  await saveShot(page, 'pin-services-after-pin-desktop.png');
});
