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

function materialSwitch(page, label) {
  return page.locator(`xpath=//*[contains(concat(" ", normalize-space(@class), " "), " md-switch ")][normalize-space(.)="${label}"]`);
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

  await page.setViewportSize(MOBILE_VIEWPORT);
  await page.getByRole('button', {name: 'Edit pin service pinata-main'}).click();
  await materialSwitch(page, 'Automatically pin new uploads').locator('.md-switch-container').click();
  await page.getByText('Automatic pin settings', {exact: true}).click();
  await page.locator('input[type=number]').fill('5');
  await page.getByRole('button', {name: 'Add automatic pin metadata'}).click();
  await page.getByLabel('Metadata key').fill('collection');
  await page.getByLabel('Metadata value').fill('uploads');
  await saveShot(page, 'pin-services-auto-pin-form-mobile.png');

  await page.setViewportSize(DESKTOP_VIEWPORT);
  await saveShot(page, 'pin-services-auto-pin-form-desktop.png');
  await page.getByRole('button', {name: 'Save', exact: true}).click();

  await expect.poll(async () => (await calls(page, 'updatePinAccount')).length).toBe(1);
  const updateCalls = await calls(page, 'updatePinAccount');
  expect(updateCalls[0]).toMatchObject({
    accountId: 1,
    accountData: {
      options: {
        autoPin: {
          enabled: true,
          attempts: 5,
          metadata: {collection: 'uploads'}
        }
      }
    }
  });
  await expect(page.getByText('Auto pin enabled', {exact: true})).toBeVisible();
  await saveShot(page, 'pin-services-auto-pin-desktop.png');

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
  await expect(page.getByText('Last pin status: ok', {exact: true})).toBeVisible();
  await saveShot(page, 'pin-services-after-pin-desktop.png');
});

test('group settings configure explicit automatic pin targets (dual viewport)', async ({page, baseURL}) => {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await page.goto(`${baseURL}/#group-pin-services`);

  await expect(page.getByRole('heading', {name: 'Group pin services'})).toBeVisible();
  await expect(page.getByText('group-pinata', {exact: true})).toBeVisible();
  await expect(page.getByText(/Auto pin: manifests/)).toBeVisible();
  await expect(page.getByText('Pin uploaded content')).toHaveCount(0);
  await saveShot(page, 'group-pin-services-mobile.png');

  await page.setViewportSize(DESKTOP_VIEWPORT);
  await saveShot(page, 'group-pin-services-desktop.png');
  await page.getByRole('button', {name: 'Edit pin service group-pinata'}).click();

  await expect(materialSwitch(page, 'Automatically pin published group posts')).toBeVisible();
  await expect(page.getByText('Post manifests', {exact: true})).toBeVisible();
  await expect(page.getByText('Attachments and content', {exact: true})).toBeVisible();
  await page.getByText('Post manifests', {exact: true}).click();
  await expect(page.getByText('Select at least one automatic pin target.')).toBeVisible();
  await expect(page.getByRole('button', {name: 'Save', exact: true})).toBeDisabled();
  await page.getByText('Attachments and content', {exact: true}).click();
  await saveShot(page, 'group-pin-services-targets-desktop.png');
  await page.getByRole('button', {name: 'Save', exact: true}).click();

  await expect.poll(async () => (await calls(page, 'updatePinAccount')).length).toBe(1);
  const updateCalls = await calls(page, 'updatePinAccount');
  expect(updateCalls[0]).toMatchObject({
    accountId: 3,
    accountData: {
      groupId: 31,
      options: {
        autoPin: {
          enabled: true,
          scope: 'group-post',
          targets: ['contents']
        }
      }
    }
  });
});
