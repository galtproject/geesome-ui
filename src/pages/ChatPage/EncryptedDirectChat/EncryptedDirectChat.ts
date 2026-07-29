import browserE2eeHelper from 'geesome-libs-e2ee/src/browserE2eeHelper';
import fileSaver from 'file-saver';
import chatDeviceStore from '../../../services/chatDeviceStore';
import chatDeviceTrustStore from '../../../services/chatDeviceTrustStore';
import {
  getActiveChatDeviceBundles,
  getChatRecipientEndpoint,
  mergeEncryptedChatMessages,
  uniqueBundles
} from '../../../services/encryptedChat';
import {
  createMessageAttachment,
  createPendingChatAttachment,
  decryptChatAttachment,
  encryptAndUploadChatAttachment,
  formatAttachmentSize,
  isPreviewImage
} from '../../../services/encryptedChatAttachments';

const refreshIntervalMs = 15000;
const messagePageSize = 100;

export default {
  name: 'encrypted-direct-chat',
  template: require('./EncryptedDirectChat.template'),
  props: {
    ownerId: {
      type: String,
      required: true
    },
    recipientOwnerId: {
      type: String,
      required: true
    },
    conversationId: {
      type: String,
      required: true
    }
  },
  async created() {
    await this.refresh();
    this.refreshTimer = window.setInterval(() => this.refresh(false), refreshIntervalMs);
  },
  beforeDestroy() {
    if (this.refreshTimer) {
      window.clearInterval(this.refreshTimer);
    }
    this.releaseAttachmentObjectUrls();
  },
  methods: {
    async refresh(showLoading = true) {
      if (this.refreshing || !this.conversationId) {
        return;
      }
      this.refreshing = true;
      if (showLoading) {
        this.loading = true;
      }
      this.error = '';
      try {
        this.localDevice = await chatDeviceStore.getCurrent(this.ownerId);
        if (!this.localDevice) {
          return;
        }
        const [ownDevicesResponse, recipient] = await Promise.all([
          this.$geesome.getOwnChatDevices(),
          this.$geesome.getUser(this.recipientOwnerId)
        ]);
        this.recipient = recipient;
        this.ownDeviceBundles = getActiveChatDeviceBundles(ownDevicesResponse.list);
        this.recipientEndpoint = getChatRecipientEndpoint(
          recipient,
          this.recipientOwnerId
        );
        const recipientDevicesResponse = await this.$geesome.getRemoteChatDevices(
          this.recipientOwnerId,
          recipient.chatTransport
        );
        this.recipientDeviceBundles = getActiveChatDeviceBundles(
          recipientDevicesResponse.list
        );
        await this.loadRecipientDeviceTrust();
        if (!this.currentDeviceRegistered) {
          throw new Error('current_chat_device_not_registered');
        }
        if (!this.recipientDeviceBundles.length) {
          throw new Error('recipient_chat_devices_unavailable');
        }
        this.recipientUnavailableReason = '';
        if (this.recipientVerified) {
          await this.readMessages();
        }
      } catch (error) {
        this.handleAvailabilityError(error);
      } finally {
        this.refreshing = false;
        this.loading = false;
      }
    },
    async readMessages() {
      const events = await this.getNewEncryptedEvents();
      const senderBundles = new Map(
        uniqueBundles([
          ...this.ownDeviceBundles,
          ...this.recipientDeviceBundles
        ]).map(bundle => [bundle.keyId, bundle])
      );
      const decrypted = [];
      for (const event of events) {
        if (this.messageIds.has(event.messageId)) {
          continue;
        }
        const senderBundle = senderBundles.get(event.envelope?.sender?.keyId);
        if (!senderBundle) {
          continue;
        }
        try {
          const content = await this.decryptMessageContent(event.envelope, senderBundle);
          decrypted.push({
            messageId: event.messageId,
            sequence: event.sequence,
            createdAt: event.envelope.createdAt,
            text: content.text,
            attachments: content.attachments,
            isOwn: event.envelope.sender.ownerId === this.ownerId,
            deliveryLabel: event.envelope.sender.ownerId === this.ownerId
              ? await this.getDeliveryLabel(event.messageId)
              : ''
          });
          if (event.envelope.sender.ownerId !== this.ownerId) {
            await this.markMessageRead(event.messageId);
          }
        } catch (_error) {
          continue;
        }
      }
      this.messages = mergeEncryptedChatMessages(this.messages, decrypted);
      await this.refreshPendingDeliveryLabels();
      this.messageIds = new Set(this.messages.map(message => message.messageId));
    },
    async getNewEncryptedEvents() {
      const events = [];
      let afterSequence = this.lastFetchedSequence;
      while (true) {
        const response = await this.$geesome.getEncryptedChatEvents(
          this.conversationId,
          {
            afterSequence,
            limit: messagePageSize
          }
        );
        const page = response.list || [];
        if (!page.length) {
          return events;
        }
        events.push(...page);
        const nextSequence = String(page[page.length - 1].sequence);
        if (compareSequences(nextSequence, afterSequence) <= 0) {
          throw new Error('encrypted_chat_sequence_did_not_advance');
        }
        afterSequence = nextSequence;
        this.lastFetchedSequence = nextSequence;
        if (page.length < messagePageSize) {
          return events;
        }
      }
    },
    async markMessageRead(messageId) {
      try {
        await this.$geesome.setEncryptedChatReceipt(messageId, 'read');
      } catch (_error) {
        // Receipt retries must not hide a message that was decrypted successfully.
      }
    },
    async refreshPendingDeliveryLabels() {
      const pendingMessages = this.messages.filter(message =>
        message.isOwn &&
        message.deliveryLabel !== 'Delivered' &&
        message.deliveryLabel !== 'Delivery failed'
      );
      if (!pendingMessages.length) {
        return;
      }
      await Promise.all(pendingMessages.map(async message => {
        message.deliveryLabel = await this.getDeliveryLabel(message.messageId);
      }));
      this.messages = [...this.messages];
    },
    async sendMessage() {
      const text = this.newMessage.trim();
      if ((!text && !this.pendingAttachments.length) || !this.canSend) {
        return;
      }
      this.sending = true;
      this.error = '';
      try {
        let plaintext = text;
        const envelopeOptions: any = {conversationId: this.conversationId};
        if (this.pendingAttachments.length) {
          const attachmentReferences = await this.preparePendingAttachments();
          const payload = browserE2eeHelper.createChatMessagePayload(
            text,
            attachmentReferences
          );
          plaintext = payload;
          envelopeOptions.metadata =
            browserE2eeHelper.createChatMessageEnvelopeMetadata(payload);
        }
        const recipients = uniqueBundles([
          ...this.recipientDeviceBundles,
          ...this.ownDeviceBundles
        ]);
        const envelope = await browserE2eeHelper.encryptEnvelope(
          plaintext,
          recipients,
          this.localDevice,
          envelopeOptions
        );
        await this.$geesome.createEncryptedChatEvent(envelope, [
          this.recipientEndpoint
        ]);
        this.newMessage = '';
        this.pendingAttachments = [];
        await this.readMessages();
      } catch (error) {
        this.error = getErrorMessage(error, 'The encrypted message could not be sent.');
      } finally {
        this.sending = false;
      }
    },
    selectAttachments(event) {
      const files = Array.from(event.target.files || []);
      event.target.value = '';
      if (!files.length) {
        return;
      }
      const available = browserE2eeHelper.constants.MAXIMUM_CHAT_ATTACHMENTS -
        this.pendingAttachments.length;
      if (available <= 0) {
        this.error = 'A message can contain up to 20 attachments.';
        return;
      }
      this.pendingAttachments = [
        ...this.pendingAttachments,
        ...files.slice(0, available).map(createPendingChatAttachment)
      ];
      if (files.length > available) {
        this.error = 'A message can contain up to 20 attachments.';
      }
    },
    removePendingAttachment(attachmentId) {
      if (this.sending) {
        return;
      }
      const attachment = this.pendingAttachments.find(
        item => item.id === attachmentId
      );
      this.pendingAttachments = this.pendingAttachments.filter(
        item => item.id !== attachmentId
      );
      this.cancelPendingAttachmentReservation(attachment);
    },
    async preparePendingAttachments() {
      const references = [];
      for (const pending of this.pendingAttachments) {
        if (pending.reference) {
          references.push(pending.reference);
          continue;
        }
        try {
          this.setPendingAttachmentState(pending.id, 'encrypting');
          const upload = await encryptAndUploadChatAttachment(
            pending.file,
            {
              createReservation: expectedBytes =>
                this.$geesome.createChatAttachmentUploadReservation(expectedBytes),
              saveFile: (file, params) => this.$geesome.saveFile(file, params),
              cancelReservation: reservationId =>
                this.$geesome.cancelChatAttachmentUploadReservation(reservationId)
            },
            state => this.setPendingAttachmentState(pending.id, state)
          );
          this.setPendingAttachmentState(pending.id, 'ready', upload);
          references.push(upload.reference);
        } catch (error) {
          this.setPendingAttachmentState(pending.id, 'failed');
          throw error;
        }
      }
      return references;
    },
    setPendingAttachmentState(attachmentId, state, upload = null) {
      this.pendingAttachments = this.pendingAttachments.map(attachment =>
        attachment.id === attachmentId
          ? {
            ...attachment,
            state,
            reference: upload?.reference || attachment.reference,
            reservationId: upload?.reservationId || attachment.reservationId
          }
          : attachment
      );
    },
    async cancelPendingAttachmentReservation(attachment) {
      if (!attachment?.reservationId) {
        return;
      }
      try {
        await this.$geesome.cancelChatAttachmentUploadReservation(
          attachment.reservationId
        );
      } catch (_error) {
        // Expiry handles reservations that cannot be cancelled while offline.
      }
    },
    async decryptMessageContent(envelope, senderBundle) {
      if (envelope.encoding !== 'json') {
        return {
          text: await browserE2eeHelper.decryptEnvelopeText(
            envelope,
            this.localDevice,
            senderBundle
          ),
          attachments: []
        };
      }
      const payload = await browserE2eeHelper.decryptEnvelopeJson(
        envelope,
        this.localDevice,
        senderBundle
      );
      if (!browserE2eeHelper.isChatMessagePayload(payload)) {
        throw new Error('chat_message_payload_invalid');
      }
      return {
        text: payload.text,
        attachments: payload.attachments.map(createMessageAttachment)
      };
    },
    async decryptMessageAttachment(attachment) {
      if (attachment.state === 'loading' || attachment.state === 'ready') {
        return;
      }
      this.updateMessageAttachment(attachment, {state: 'loading', error: ''});
      try {
        const blob = await decryptChatAttachment(
          attachment.reference,
          storageId => this.$geesome.getContentLink(storageId)
        );
        this.updateMessageAttachment(attachment, {
          state: 'ready',
          blob,
          objectUrl: URL.createObjectURL(blob)
        });
      } catch (_error) {
        this.updateMessageAttachment(attachment, {
          state: 'failed',
          error: 'Attachment unavailable or failed its integrity check.'
        });
      }
    },
    downloadMessageAttachment(attachment) {
      if (attachment.state === 'ready' && attachment.blob) {
        fileSaver.saveAs(attachment.blob, attachment.name);
      }
    },
    updateMessageAttachment(target, changes) {
      Object.assign(target, changes);
      this.messages = [...this.messages];
    },
    releaseAttachmentObjectUrls() {
      this.messages.forEach(message => {
        (message.attachments || []).forEach(attachment => {
          if (attachment.objectUrl) {
            URL.revokeObjectURL(attachment.objectUrl);
          }
        });
      });
    },
    getPendingAttachmentStatus(attachment) {
      if (attachment.state === 'encrypting') {
        return 'Encrypting';
      }
      if (attachment.state === 'reserving') {
        return 'Reserving encrypted upload';
      }
      if (attachment.state === 'uploading') {
        return 'Uploading ciphertext';
      }
      if (attachment.state === 'ready') {
        return 'Encrypted';
      }
      if (attachment.state === 'failed') {
        return 'Upload failed · retry on send';
      }
      return 'Selected';
    },
    async loadRecipientDeviceTrust() {
      const [fingerprints, trustedDevices] = await Promise.all([
        Promise.all(this.recipientDeviceBundles.map(bundle =>
          browserE2eeHelper.getDeviceFingerprint(bundle)
        )),
        chatDeviceTrustStore.list(this.recipientOwnerId)
      ]);
      const trustedByKeyId = new Map(
        trustedDevices.map(device => [device.keyId, device])
      );
      this.recipientDeviceFingerprints = fingerprints.map(fingerprint => ({
        ...fingerprint,
        trusted: isMatchingTrustedDevice(
          trustedByKeyId.get(fingerprint.keyId),
          fingerprint
        )
      }));
    },
    async setDeviceTrusted(fingerprint, trusted) {
      if (!fingerprint || this.verifyingDeviceKeyId) {
        return;
      }
      this.verifyingDeviceKeyId = fingerprint.keyId;
      this.error = '';
      try {
        if (trusted) {
          await chatDeviceTrustStore.save(fingerprint);
        } else {
          await chatDeviceTrustStore.remove(fingerprint.keyId);
        }
        await this.loadRecipientDeviceTrust();
        if (this.recipientVerified) {
          this.showDeviceVerification = false;
          await this.readMessages();
        }
      } catch (error) {
        this.error = getErrorMessage(error, 'The device verification could not be saved.');
      } finally {
        this.verifyingDeviceKeyId = '';
      }
    },
    async getDeliveryLabel(messageId) {
      try {
        const response = await this.$geesome.getEncryptedChatEventDeliveries(messageId);
        const deliveries = response.list || [];
        if (deliveries.some(delivery => delivery.state === 'failed')) {
          return 'Delivery failed';
        }
        if (deliveries.length && deliveries.every(delivery => delivery.state === 'delivered')) {
          return 'Delivered';
        }
        return deliveries.length ? 'Queued' : 'Saved';
      } catch (_error) {
        return 'Saved';
      }
    },
    handleAvailabilityError(error) {
      const message = getErrorMessage(error, '');
      if (
        message.includes('recipient_chat_transport_unavailable') ||
        message.includes('recipient_chat_identity_unavailable')
      ) {
        this.recipientUnavailableReason = 'transport';
        return;
      }
      if (message.includes('recipient_chat_devices_unavailable')) {
        this.recipientUnavailableReason = 'devices';
        return;
      }
      if (message.includes('current_chat_device_not_registered')) {
        this.recipientUnavailableReason = 'registration';
        return;
      }
      this.error = getErrorMessage(error, 'Secure chat status is unavailable.');
    },
    formatDate(value) {
      return value ? new Date(value).toLocaleString() : '';
    },
    formatAttachmentSize,
    isPreviewImage
  },
  computed: {
    currentDeviceRegistered() {
      return !!this.localDevice && this.ownDeviceBundles.some(bundle =>
        bundle.keyId === this.localDevice.keyId
      );
    },
    recipientReady() {
      return !!this.recipientEndpoint &&
        this.currentDeviceRegistered &&
        this.recipientDeviceBundles.length > 0;
    },
    recipientVerified() {
      return this.recipientDeviceFingerprints.length > 0 &&
        this.recipientDeviceFingerprints.every(device => device.trusted);
    },
    recipientName() {
      return this.recipient?.title || this.recipient?.name || '';
    },
    recipientUnavailableMessage() {
      if (this.recipientUnavailableReason === 'devices') {
        return 'Your contact has not registered an active secure-chat browser yet.';
      }
      if (this.recipientUnavailableReason === 'registration') {
        return 'This browser device must be registered again in Chat security.';
      }
      return 'Your contact needs to update their profile from a GeeSome node with a public chat address.';
    },
    canSend() {
      return !this.sending &&
        this.recipientReady &&
        this.recipientVerified &&
        (!!this.newMessage.trim() || this.pendingAttachments.length > 0);
    }
  },
  data() {
    return {
      loading: false,
      refreshing: false,
      sending: false,
      error: '',
      localDevice: null,
      recipient: null,
      recipientEndpoint: null,
      recipientUnavailableReason: '',
      ownDeviceBundles: [],
      recipientDeviceBundles: [],
      recipientDeviceFingerprints: [],
      verifyingDeviceKeyId: '',
      showDeviceVerification: false,
      messages: [],
      messageIds: new Set(),
      lastFetchedSequence: '0',
      newMessage: '',
      pendingAttachments: [],
      refreshTimer: null
    };
  }
};

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback;
}

function compareSequences(left, right) {
  const leftValue = BigInt(left || 0);
  const rightValue = BigInt(right || 0);
  if (leftValue === rightValue) {
    return 0;
  }
  return leftValue < rightValue ? -1 : 1;
}

function isMatchingTrustedDevice(trustedDevice, fingerprint) {
  return !!trustedDevice &&
    trustedDevice.ownerId === fingerprint.ownerId &&
    trustedDevice.deviceId === fingerprint.deviceId &&
    trustedDevice.version === fingerprint.version &&
    trustedDevice.algorithm === fingerprint.algorithm &&
    trustedDevice.value === fingerprint.value;
}
