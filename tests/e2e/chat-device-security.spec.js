const path = require('path');
const {test, expect} = require('@playwright/test');
const {
  captureScreenshot,
  assertImagesLoaded,
  assertNoHorizontalOverflow
} = require('./screenshot-capture');

const repoRoot = path.resolve(__dirname, '../..');
const screenshotDir = path.join(repoRoot, '.agent/tasks/chat-device-security-e2e/screenshots');
const MOBILE_VIEWPORT = {width: 375, height: 667};
const DESKTOP_VIEWPORT = {width: 1280, height: 800};
const PASSPHRASE = 'correct horse battery staple';

async function saveShot(page, name) {
  await captureScreenshot(page, screenshotDir, name);
  await assertImagesLoaded(page);
  await assertNoHorizontalOverflow(page);
}

async function calls(page, type) {
  return page.evaluate((callType) => {
    const all = window.__CHAT_SECURITY_E2E__.calls;
    return callType ? all.filter(item => item.type === callType) : all;
  }, type);
}

async function clearStoredDevices(page) {
  await page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('geesome-chat-device-keys');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction('devices', 'readwrite');
      transaction.objectStore('devices').clear();
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    };
  }));
}

test('browser chat device can be created, backed up, restored, and revoked', async ({page, baseURL}) => {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await page.goto(`${baseURL}/#chat-security`);

  await expect(page.getByRole('heading', {name: 'Chat security'})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Secure this browser'})).toBeVisible();
  await saveShot(page, 'chat-security-setup-mobile.png');

  await page.getByLabel('Recovery passphrase', {exact: true}).first().fill(PASSPHRASE);
  await page.getByLabel('Confirm recovery passphrase').fill(PASSPHRASE);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', {name: 'Create secure chat device'}).click();
  const download = await downloadPromise;
  const recoveryPath = await download.path();

  await expect(page.getByRole('heading', {name: 'This browser is ready'})).toBeVisible();
  await expect(page.getByText(/^Fingerprint /)).toBeVisible();
  await saveShot(page, 'chat-security-ready-mobile.png');

  const registerCalls = await calls(page, 'registerChatDevice');
  expect(registerCalls).toHaveLength(1);
  expect(registerCalls[0].publicBundle).not.toHaveProperty('privateKeys');
  expect(registerCalls[0].publicBundle).not.toHaveProperty('recoveryBundle');

  const storedKeyState = await page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('geesome-chat-device-keys');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction('devices', 'readonly');
      const getAll = transaction.objectStore('devices').getAll();
      getAll.onerror = () => reject(getAll.error);
      getAll.onsuccess = () => {
        const record = getAll.result[0];
        database.close();
        resolve({
          count: getAll.result.length,
          encryptionExtractable: record.privateKeys.encryptionKey.extractable,
          signingExtractable: record.privateKeys.signingKey.extractable,
          hasRecoveryBundle: !!record.recoveryBundle
        });
      };
    };
  }));
  expect(storedKeyState).toEqual({
    count: 1,
    encryptionExtractable: false,
    signingExtractable: false,
    hasRecoveryBundle: true
  });

  await clearStoredDevices(page);
  await page.reload();
  await expect(page.getByRole('heading', {name: 'Secure this browser'})).toBeVisible();
  await page.getByText('Restore from recovery file', {exact: true}).click();
  await page.locator('input[type=file]').setInputFiles(recoveryPath);
  await page.getByLabel('Recovery passphrase', {exact: true}).last().fill(PASSPHRASE);
  await page.getByRole('button', {name: 'Restore secure chat device'}).click();
  await expect(page.getByRole('heading', {name: 'This browser is ready'})).toBeVisible();

  const deviceDetails = page.locator('details').filter({hasText: 'Devices and fingerprints'});
  await deviceDetails.evaluate(details => {
    details.open = true;
  });
  await expect(deviceDetails).toHaveAttribute('open', '');
  await expect(deviceDetails.getByText('This browser', {exact: true})).toBeVisible();
  await saveShot(page, 'chat-security-restored-mobile.png');

  await page.setViewportSize(DESKTOP_VIEWPORT);
  await saveShot(page, 'chat-security-restored-desktop.png');

  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', {name: /Revoke chat device/}).click();
  await expect(page.getByRole('heading', {name: 'Secure this browser'})).toBeVisible();
  expect(await calls(page, 'revokeChatDevice')).toHaveLength(1);
});
