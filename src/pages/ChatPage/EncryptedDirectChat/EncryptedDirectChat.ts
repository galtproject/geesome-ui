import browserE2eeHelper from 'geesome-libs-e2ee/src/browserE2eeHelper';
import chatDeviceStore from '../../../services/chatDeviceStore';
import {
  getActiveChatDeviceBundles,
  getChatRecipientEndpoint,
  mergeEncryptedChatMessages,
  uniqueBundles
} from '../../../services/encryptedChat';

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
        if (!this.currentDeviceRegistered) {
          throw new Error('current_chat_device_not_registered');
        }
        if (!this.recipientDeviceBundles.length) {
          throw new Error('recipient_chat_devices_unavailable');
        }
        this.recipientUnavailableReason = '';
        await this.readMessages();
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
          const text = await browserE2eeHelper.decryptEnvelopeText(
            event.envelope,
            this.localDevice,
            senderBundle
          );
          decrypted.push({
            messageId: event.messageId,
            sequence: event.sequence,
            createdAt: event.envelope.createdAt,
            text,
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
      if (!text || !this.canSend) {
        return;
      }
      this.sending = true;
      this.error = '';
      try {
        const recipients = uniqueBundles([
          ...this.recipientDeviceBundles,
          ...this.ownDeviceBundles
        ]);
        const envelope = await browserE2eeHelper.encryptEnvelope(
          text,
          recipients,
          this.localDevice,
          {conversationId: this.conversationId}
        );
        await this.$geesome.createEncryptedChatEvent(envelope, [
          this.recipientEndpoint
        ]);
        this.newMessage = '';
        await this.readMessages();
      } catch (error) {
        this.error = getErrorMessage(error, 'The encrypted message could not be sent.');
      } finally {
        this.sending = false;
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
    }
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
      return !this.sending && this.recipientReady && !!this.newMessage.trim();
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
      messages: [],
      messageIds: new Set(),
      lastFetchedSequence: '0',
      newMessage: '',
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
