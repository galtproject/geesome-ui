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
  await expect(page.getByText('Encrypted hello from Bob')).toBeVisible();
  await saveShot(page, 'encrypted-direct-chat-incoming-mobile.png');

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
