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
  await expect(page.getByText('encrypted-pixel.png')).toBeVisible();
  await expect(page.getByRole('img', {name: 'encrypted-pixel.png'})).toHaveCount(0);
  await page.getByRole('button', {name: 'Decrypt attachment encrypted-pixel.png'}).click();
  await expect(page.getByRole('img', {name: 'encrypted-pixel.png'})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Download attachment encrypted-pixel.png'})).toBeVisible();
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
  const attachmentPlaintext = 'Private attachment from Alice';
  await page.getByLabel('Choose encrypted attachments').setInputFiles({
    name: 'private-note.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from(attachmentPlaintext)
  });
  await expect(page.getByText('private-note.txt')).toBeVisible();
  await page.getByRole('textbox', {name: 'Encrypted message', exact: true}).fill(plaintext);
  await page.getByRole('button', {name: 'Send encrypted message'}).click();

  await expect(page.getByText(plaintext)).toBeVisible();
  await expect(page.getByText('Delivered')).toBeVisible();

  const sendCalls = await chatCalls(page, 'createEncryptedChatEvent');
  expect(sendCalls).toHaveLength(1);
  expect(JSON.stringify(sendCalls[0].envelope)).not.toContain(plaintext);
  expect(JSON.stringify(sendCalls[0].envelope)).not.toContain(attachmentPlaintext);
  expect(JSON.stringify(sendCalls[0].envelope)).not.toContain('private-note.txt');
  expect(sendCalls[0].envelope.metadata.kind).toBe('json');
  expect(sendCalls[0].envelope.metadata.attachmentStorageIds).toHaveLength(1);
  expect(sendCalls[0].envelope.recipientKeyIds).toHaveLength(2);
  expect(sendCalls[0].recipientEndpoints).toEqual([{
    ownerId: 'owner-remote',
    publicKey: 'remote-static-identity-public-key',
    inboxUrl: 'https://remote.example/v1/chat/inbox'
  }]);
  expect(sendCalls[0].envelope.conversationId).toMatch(/^\/geesome\/group\/[a-f0-9]{64}$/);

  const uploadCalls = await chatCalls(page, 'saveFile');
  const encryptedUpload = uploadCalls.find(call =>
    call.fileName.startsWith('encrypted-chat-')
  );
  const reservationCalls = await chatCalls(
    page,
    'createChatAttachmentUploadReservation'
  );
  expect(reservationCalls).toHaveLength(1);
  expect(encryptedUpload).toBeTruthy();
  expect(encryptedUpload.fileName).not.toBe('private-note.txt');
  expect(encryptedUpload.fileType).toBe('application/octet-stream');
  expect(encryptedUpload.fileText).not.toContain(attachmentPlaintext);
  expect(reservationCalls[0].expectedBytes).toBe(encryptedUpload.fileSize);
  expect(encryptedUpload.params.chatAttachmentReservationId).toBe(
    reservationCalls[0].reservation.reservationId
  );
  expect(await chatCalls(page, 'cancelChatAttachmentUploadReservation')).toHaveLength(0);
  await expect(page.getByText('private-note.txt')).toBeVisible();
  await page.getByRole('button', {name: 'Decrypt attachment private-note.txt'}).click();
  await expect(page.getByRole('button', {name: 'Download attachment private-note.txt'})).toBeVisible();

  const compatibleText = 'Compatible encrypted text';
  await page.getByRole('textbox', {name: 'Encrypted message', exact: true}).fill(compatibleText);
  await page.getByRole('button', {name: 'Send encrypted message'}).click();
  await expect(page.getByText(compatibleText)).toBeVisible();
  const allSendCalls = await chatCalls(page, 'createEncryptedChatEvent');
  expect(allSendCalls).toHaveLength(2);
  expect(allSendCalls[1].envelope.encoding).toBe('utf8');
  expect(allSendCalls[1].envelope.metadata).toEqual({});
  expect(JSON.stringify(allSendCalls[1].envelope)).not.toContain(compatibleText);

  const receiptCalls = await chatCalls(page, 'setEncryptedChatReceipt');
  expect(receiptCalls.some(call =>
    call.messageId === 'encrypted-message-incoming' && call.state === 'read'
  )).toBe(true);

  await saveShot(page, 'encrypted-direct-chat-sent-mobile.png');
  await page.setViewportSize(DESKTOP_VIEWPORT);
  await saveShot(page, 'encrypted-direct-chat-sent-desktop.png');

  await page.setViewportSize(MOBILE_VIEWPORT);
  await page.getByLabel('Choose encrypted attachments').setInputFiles({
    name: 'retry-note.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Reuse this encrypted upload after event rejection')
  });
  await page.getByRole('textbox', {name: 'Encrypted message', exact: true})
    .fill('Retry without re-uploading ciphertext');
  await page.evaluate(() => window.__ENCRYPTED_CHAT_E2E__.failNextEvent());
  await page.getByRole('button', {name: 'Send encrypted message'}).click();
  await expect(page.getByText('encrypted_chat_event_rejected_for_test')).toBeVisible();
  const uploadsBeforeRetry = await chatCalls(page, 'saveFile');
  const reservationsBeforeRetry = await chatCalls(
    page,
    'createChatAttachmentUploadReservation'
  );
  await page.getByRole('button', {name: 'Send encrypted message'}).click();
  await expect(page.getByText('Retry without re-uploading ciphertext')).toBeVisible();
  expect(await chatCalls(page, 'saveFile')).toHaveLength(uploadsBeforeRetry.length);
  expect(await chatCalls(page, 'createChatAttachmentUploadReservation')).toHaveLength(
    reservationsBeforeRetry.length
  );

  await page.getByLabel('Choose encrypted attachments').setInputFiles({
    name: 'discarded-note.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Discard this encrypted attachment')
  });
  await page.getByRole('textbox', {name: 'Encrypted message', exact: true})
    .fill('Message rejected before local acceptance');
  await page.evaluate(() => window.__ENCRYPTED_CHAT_E2E__.failNextEvent());
  await page.getByRole('button', {name: 'Send encrypted message'}).click();
  await expect(page.getByText('encrypted_chat_event_rejected_for_test')).toBeVisible();
  await page.getByRole('button', {name: 'Remove attachment discarded-note.txt'}).click();

  const cancelledUploads = await chatCalls(
    page,
    'cancelChatAttachmentUploadReservation'
  );
  expect(cancelledUploads).toHaveLength(1);
  const discardedUpload = (await chatCalls(page, 'saveFile')).find(call =>
    call.fileName.startsWith('encrypted-chat-') &&
    call.params.chatAttachmentReservationId === cancelledUploads[0].reservationId
  );
  expect(discardedUpload).toBeTruthy();
});
