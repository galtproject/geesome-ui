const chatName = require('geesome-libs/src/name');

const deliveryProtocol = 'geesome-chat-delivery-v1';
const syncProtocol = 'geesome-chat-sync-v1';

export function getDirectConversationId(memberOwnerIds, theme = 'default') {
  const ownerIds = uniqueStrings(memberOwnerIds);
  if (ownerIds.length !== 2) {
    throw new Error('direct_chat_members_invalid');
  }
  return chatName.getPersonalChatTopic(ownerIds, theme);
}

export function getOtherChatOwnerId(memberOwnerIds, currentOwnerId) {
  return uniqueStrings(memberOwnerIds).find(ownerId => ownerId !== currentOwnerId) || '';
}

export function getChatRecipientEndpoint(recipientProfile, recipientOwnerId) {
  if (
    !recipientProfile ||
    recipientProfile.staticId !== recipientOwnerId ||
    typeof recipientProfile.publicKey !== 'string' ||
    !recipientProfile.publicKey
  ) {
    throw new Error('recipient_chat_identity_unavailable');
  }
  const transport = normalizeChatTransport(recipientProfile.chatTransport);
  if (!transport) {
    throw new Error('recipient_chat_transport_unavailable');
  }
  return {
    ownerId: recipientOwnerId,
    publicKey: recipientProfile.publicKey,
    inboxUrl: transport.inboxUrl
  };
}

export function getChatDeviceDiscoveryUrl(chatTransport, ownerId) {
  const transport = normalizeChatTransport(chatTransport);
  if (!transport || !ownerId) {
    throw new Error('recipient_chat_transport_unavailable');
  }
  return transport.deviceDiscoveryTemplate.replace(
    '{ownerId}',
    encodeURIComponent(ownerId)
  );
}

export function getActiveChatDeviceBundles(deviceRecords) {
  return uniqueBundles((deviceRecords || [])
    .filter(device => device && !device.revokedAt)
    .map(device => device.publicBundle || device));
}

export function uniqueBundles(bundles) {
  const byKeyId = new Map();
  (bundles || []).forEach((bundle) => {
    if (bundle && bundle.keyId && !byKeyId.has(bundle.keyId)) {
      byKeyId.set(bundle.keyId, bundle);
    }
  });
  return Array.from(byKeyId.values());
}

export function mergeEncryptedChatMessages(currentMessages, nextMessages) {
  const byMessageId = new Map();
  [...(currentMessages || []), ...(nextMessages || [])].forEach((message) => {
    if (message && message.messageId) {
      byMessageId.set(message.messageId, message);
    }
  });
  return Array.from(byMessageId.values()).sort((left, right) =>
    compareIntegerStrings(left.sequence, right.sequence)
  );
}

function normalizeChatTransport(value) {
  if (
    !value ||
    value.protocol !== deliveryProtocol ||
    value.syncProtocol !== syncProtocol
  ) {
    return null;
  }
  try {
    const publicUrl = normalizePublicUrl(value.publicUrl);
    const expected = {
      inboxUrl: `${publicUrl}/v1/chat/inbox`,
      syncUrl: `${publicUrl}/v1/chat/sync`,
      deviceDiscoveryTemplate: `${publicUrl}/v1/chat/public/users/{ownerId}/devices`
    };
    if (
      value.inboxUrl !== expected.inboxUrl ||
      value.syncUrl !== expected.syncUrl ||
      value.deviceDiscoveryTemplate !== expected.deviceDiscoveryTemplate
    ) {
      return null;
    }
    return {...value, publicUrl, ...expected};
  } catch (_error) {
    return null;
  }
}

function normalizePublicUrl(value) {
  const url = new URL(value);
  if (
    (url.protocol !== 'https:' && url.protocol !== 'http:') ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error('chat_public_url_invalid');
  }
  url.pathname = url.pathname.replace(/\/+$/, '');
  return url.toString().replace(/\/$/, '');
}

function uniqueStrings(values) {
  return Array.from(new Set(
    (values || []).filter(value => typeof value === 'string' && value)
  )).sort();
}

function compareIntegerStrings(left, right) {
  const leftValue = BigInt(left || 0);
  const rightValue = BigInt(right || 0);
  if (leftValue === rightValue) {
    return 0;
  }
  return leftValue < rightValue ? -1 : 1;
}
