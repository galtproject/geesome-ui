import browserE2eeHelper from 'geesome-libs-e2ee/src/browserE2eeHelper';

const previewImageTypes = new Set([
  'image/avif',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp'
]);

export function createPendingChatAttachment(file) {
  return {
    id: createLocalAttachmentId(),
    file,
    state: 'selected',
    reference: null
  };
}

export async function encryptAndUploadChatAttachment(file, saveFile, onUploadStart) {
  const encrypted = await browserE2eeHelper.encryptAttachment(
    await file.arrayBuffer(),
    {
      name: file.name || null,
      mimeType: file.type || 'application/octet-stream'
    }
  );
  const uploadFile = new File(
    [browserE2eeHelper.getAttachmentUploadData(encrypted.attachment)],
    `encrypted-chat-${createLocalAttachmentId()}.bin`,
    {type: 'application/octet-stream'}
  );
  if (onUploadStart) {
    onUploadStart();
  }
  const uploaded = await saveFile(uploadFile);
  if (!uploaded?.storageId) {
    throw new Error('attachment_upload_storage_id_missing');
  }
  return browserE2eeHelper.createAttachmentReference(
    uploaded.storageId,
    encrypted.attachment,
    encrypted.key
  );
}

export async function decryptChatAttachment(reference, getContentLink) {
  const link = await getContentLink(reference.storageId);
  const response = await fetch(link);
  if (!response.ok) {
    throw new Error('attachment_download_failed');
  }
  const plaintext = await browserE2eeHelper.decryptAttachmentReference(
    await response.arrayBuffer(),
    reference
  );
  return new Blob([plaintext], {type: reference.encryption.mimeType});
}

export function createMessageAttachment(reference) {
  return {
    storageId: reference.storageId,
    name: reference.encryption.name || 'Encrypted attachment',
    mimeType: reference.encryption.mimeType,
    size: reference.encryption.size,
    reference,
    state: 'encrypted',
    objectUrl: '',
    blob: null,
    error: ''
  };
}

export function isPreviewImage(attachment) {
  return previewImageTypes.has(attachment.mimeType);
}

export function formatAttachmentSize(value) {
  const size = Number(value || 0);
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function createLocalAttachmentId() {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return browserE2eeHelper.encodeBase64Url(bytes);
}
