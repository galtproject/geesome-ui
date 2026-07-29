const path = require('path');
const {test, expect} = require('@playwright/test');
const {
  captureScreenshot,
  assertImagesLoaded,
  assertNoHorizontalOverflow
} = require('./screenshot-capture');

const repoRoot = path.resolve(__dirname, '../..');
const screenshotDir = path.join(repoRoot, '.agent/tasks/encrypted-direct-chat-e2e/screenshots');
const MOBILE_VIEWPORT = {width: 375, height: 667};
const DESKTOP_VIEWPORT = {width: 1280, height: 800};

async function saveShot(page, name) {
  await captureScreenshot(page, screenshotDir, name);
  await assertImagesLoaded(page);
  await assertNoHorizontalOverflow(page);
}

async function chatCalls(page, type) {
  return page.evaluate((callType) => {
    const all = window.__ENCRYPTED_CHAT_E2E__.calls;
    return callType ? all.filter(item => item.type === callType) : all;
  }, type);
}

test('direct messages are encrypted and decrypted only in the browser', async ({page, baseURL}) => {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await page.goto(`${baseURL}/#encrypted-chat`);

  await expect(page.getByRole('heading', {name: 'Secure chat with Bob'})).toBeVisible();
  await expect(page.getByText('End-to-end encrypted on this browser')).toBeVisible();
  await expect(page.getByRole('heading', {name: "Verify Bob's devices"})).toBeVisible();
  await expect(page.getByText('Encrypted hello from Bob')).toBeHidden();
  await expect(page.locator('.encrypted-direct-chat-device code')).toHaveText(
    /^(?:[0-9A-F]{4} ){15}[0-9A-F]{4}$/
  );
  expect(await chatCalls(page, 'getEncryptedChatEvents')).toHaveLength(0);
  expect(await chatCalls(page, 'setEncryptedChatReceipt')).toHaveLength(0);
  await saveShot(page, 'encrypted-direct-chat-verification-mobile.png');
  await page.setViewportSize(DESKTOP_VIEWPORT);
  await saveShot(page, 'encrypted-direct-chat-verification-desktop.png');
  await page.setViewportSize(MOBILE_VIEWPORT);

  await page.getByRole('button', {name: 'Mark device verified browser-remote'}).click();
  await expect(page.getByText('Encrypted hello from Bob')).toBeVisible();
  await saveShot(page, 'encrypted-direct-chat-incoming-mobile.png');

  const trustedDevice = await page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('geesome-chat-device-trust');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction('trustedDevices', 'readonly');
      const getAll = transaction.objectStore('trustedDevices').getAll();
      getAll.onerror = () => reject(getAll.error);
      getAll.onsuccess = () => {
        const record = getAll.result[0];
        database.close();
        resolve({
          count: getAll.result.length,
          ownerId: record.ownerId,
          deviceId: record.deviceId,
          hasFullFingerprint: /^(?:[0-9A-F]{4} ){15}[0-9A-F]{4}$/.test(record.value)
        });
      };
    };
  }));
  expect(trustedDevice).toEqual({
    count: 1,
    ownerId: 'owner-remote',
    deviceId: 'browser-remote',
    hasFullFingerprint: true
  });

  await page.getByRole('button', {name: 'Review verified chat devices'}).click();
  await expect(page.getByRole('heading', {name: 'Verified devices for Bob'})).toBeVisible();
  await page.getByRole('button', {name: 'Remove verification for device browser-remote'}).click();
  await expect(page.getByRole('heading', {name: "Verify Bob's devices"})).toBeVisible();
  await expect(page.getByText('Encrypted hello from Bob')).toBeHidden();
  await page.getByRole('button', {name: 'Mark device verified browser-remote'}).click();
  await expect(page.getByText('Encrypted hello from Bob')).toBeVisible();

  const plaintext = 'Private reply from Alice';
  await page.getByRole('textbox', {name: 'Encrypted message', exact: true}).fill(plaintext);
  await page.getByRole('button', {name: 'Send encrypted message'}).click();

  await expect(page.getByText(plaintext)).toBeVisible();
  await expect(page.getByText('Delivered')).toBeVisible();

  const sendCalls = await chatCalls(page, 'createEncryptedChatEvent');
  expect(sendCalls).toHaveLength(1);
  expect(JSON.stringify(sendCalls[0].envelope)).not.toContain(plaintext);
  expect(sendCalls[0].envelope.recipientKeyIds).toHaveLength(2);
  expect(sendCalls[0].recipientEndpoints).toEqual([{
    ownerId: 'owner-remote',
    publicKey: 'remote-static-identity-public-key',
    inboxUrl: 'https://remote.example/v1/chat/inbox'
  }]);
  expect(sendCalls[0].envelope.conversationId).toMatch(/^\/geesome\/group\/[a-f0-9]{64}$/);

  const receiptCalls = await chatCalls(page, 'setEncryptedChatReceipt');
  expect(receiptCalls.some(call =>
    call.messageId === 'encrypted-message-incoming' && call.state === 'read'
  )).toBe(true);

  await saveShot(page, 'encrypted-direct-chat-sent-mobile.png');
  await page.setViewportSize(DESKTOP_VIEWPORT);
  await saveShot(page, 'encrypted-direct-chat-sent-desktop.png');
});
