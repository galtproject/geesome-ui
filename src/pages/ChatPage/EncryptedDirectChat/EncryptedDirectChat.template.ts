module.exports = `
<section class="encrypted-direct-chat" aria-labelledby="encrypted-chat-title">
  <header class="encrypted-direct-chat-header">
    <div>
      <h2 id="encrypted-chat-title">Secure chat<span v-if="recipientName"> with {{recipientName}}</span></h2>
      <p>
        <md-icon>lock</md-icon>
        End-to-end encrypted on this browser
      </p>
    </div>
    <div class="encrypted-direct-chat-header-actions">
      <md-button v-if="recipientReady" class="md-icon-button"
                 @click="showDeviceVerification = !showDeviceVerification"
                 aria-label="Review verified chat devices" title="Review verified devices">
        <md-icon>verified_user</md-icon>
      </md-button>
      <md-button class="md-icon-button" @click="refresh" :disabled="loading"
                 aria-label="Refresh encrypted messages" title="Refresh">
        <md-icon>refresh</md-icon>
      </md-button>
    </div>
  </header>

  <md-progress-bar v-if="loading" md-mode="indeterminate"></md-progress-bar>
  <div v-if="error" class="encrypted-direct-chat-error" role="alert">{{error}}</div>

  <div v-if="!loading && !localDevice" class="encrypted-direct-chat-empty">
    <md-icon>phonelink_lock</md-icon>
    <h3>Secure this browser first</h3>
    <p>Create or restore a browser chat device before reading or sending encrypted messages.</p>
    <md-button class="md-raised md-accent" @click="$emit('open-security')">
      <md-icon>security</md-icon>
      Open chat security
    </md-button>
  </div>

  <div v-else-if="!loading && !recipientReady" class="encrypted-direct-chat-empty">
    <md-icon>person_off</md-icon>
    <h3>Secure chat is not available yet</h3>
    <p>{{recipientUnavailableMessage}}</p>
    <md-button class="md-raised" @click="refresh">
      <md-icon>refresh</md-icon>
      Check again
    </md-button>
  </div>

  <section v-else-if="localDevice && recipientReady && (!recipientVerified || showDeviceVerification)"
           class="encrypted-direct-chat-verification"
           aria-labelledby="encrypted-chat-verification-title">
    <header>
      <md-icon>verified_user</md-icon>
      <div>
        <h3 id="encrypted-chat-verification-title">{{recipientVerified ? 'Verified devices for ' : 'Verify '}}{{recipientName || 'contact'}}{{recipientVerified ? '' : "'s devices"}}</h3>
        <p v-if="recipientVerified">These decisions are stored only in this browser. Remove verification if a device is no longer trusted.</p>
        <p v-else>Compare each fingerprint with your contact using another trusted channel. Messages stay hidden until every active device is verified.</p>
      </div>
    </header>
    <div class="encrypted-direct-chat-device-list">
      <div v-for="device in recipientDeviceFingerprints"
           :key="device.keyId"
           class="encrypted-direct-chat-device">
        <div>
          <strong>{{device.deviceId}}</strong>
          <code>{{device.value}}</code>
        </div>
        <md-button class="md-raised"
                   :class="{'md-accent': !device.trusted}"
                   @click="setDeviceTrusted(device, !device.trusted)"
          :disabled="!!verifyingDeviceKeyId"
                   :aria-label="(device.trusted ? 'Remove verification for device ' : 'Mark device verified ') + device.deviceId">
          <md-icon>{{device.trusted ? 'verified_user' : 'how_to_reg'}}</md-icon>
          {{device.trusted ? 'Remove verification' : 'Mark verified'}}
        </md-button>
      </div>
    </div>
  </section>

  <template v-else-if="localDevice && recipientReady && recipientVerified">
    <div class="encrypted-direct-chat-messages" role="log" aria-live="polite">
      <div v-if="!messages.length && !loading" class="encrypted-direct-chat-empty is-compact">
        <md-icon>forum</md-icon>
        <h3>No encrypted messages yet</h3>
        <p>Messages sent here are ciphertext everywhere outside your browsers.</p>
      </div>
      <article v-for="message in messages" :key="message.messageId"
               class="encrypted-direct-chat-message"
               :class="{'is-own': message.isOwn}">
        <div v-if="message.text" class="encrypted-direct-chat-message-text">{{message.text}}</div>
        <div v-if="message.attachments && message.attachments.length"
             class="encrypted-direct-chat-attachments">
          <section v-for="attachment in message.attachments"
                   :key="attachment.storageId"
                   class="encrypted-direct-chat-attachment">
            <img v-if="attachment.state === 'ready' && isPreviewImage(attachment)"
                 :src="attachment.objectUrl" :alt="attachment.name"
                 class="encrypted-direct-chat-attachment-preview">
            <div class="encrypted-direct-chat-attachment-info">
              <md-icon>{{isPreviewImage(attachment) ? 'image' : 'insert_drive_file'}}</md-icon>
              <div>
                <strong>{{attachment.name}}</strong>
                <span>{{formatAttachmentSize(attachment.size)}}</span>
              </div>
            </div>
            <div class="encrypted-direct-chat-attachment-actions">
              <md-button v-if="attachment.state === 'encrypted' || attachment.state === 'failed'"
                         class="md-icon-button"
                         @click="decryptMessageAttachment(attachment)"
                         :aria-label="'Decrypt attachment ' + attachment.name"
                         title="Decrypt attachment">
                <md-icon>lock_open</md-icon>
              </md-button>
              <md-progress-spinner v-else-if="attachment.state === 'loading'"
                                   :md-diameter="24" :md-stroke="3"
                                   md-mode="indeterminate"></md-progress-spinner>
              <md-button v-else-if="attachment.state === 'ready'"
                         class="md-icon-button"
                         @click="downloadMessageAttachment(attachment)"
                         :aria-label="'Download attachment ' + attachment.name"
                         title="Download">
                <md-icon>download</md-icon>
              </md-button>
            </div>
            <p v-if="attachment.error" role="alert">{{attachment.error}}</p>
          </section>
        </div>
        <footer>
          <time :datetime="message.createdAt">{{formatDate(message.createdAt)}}</time>
          <span v-if="message.isOwn">{{message.deliveryLabel}}</span>
        </footer>
      </article>
    </div>

    <form class="encrypted-direct-chat-composer" @submit.prevent="sendMessage">
      <div v-if="pendingAttachments.length" class="encrypted-direct-chat-pending-attachments">
        <div v-for="attachment in pendingAttachments" :key="attachment.id"
             class="encrypted-direct-chat-pending-attachment">
          <md-icon>insert_drive_file</md-icon>
          <div>
            <strong>{{attachment.file.name}}</strong>
            <span>{{formatAttachmentSize(attachment.file.size)}} · {{getPendingAttachmentStatus(attachment)}}</span>
          </div>
          <md-button type="button" class="md-icon-button"
                     @click="removePendingAttachment(attachment.id)"
                     :disabled="sending"
                     :aria-label="'Remove attachment ' + attachment.file.name"
                     title="Remove attachment">
            <md-icon>close</md-icon>
          </md-button>
        </div>
      </div>
      <div class="encrypted-direct-chat-composer-row">
        <input ref="attachmentInput" class="sr-only" type="file" multiple
               aria-label="Choose encrypted attachments"
               @change="selectAttachments">
        <md-button type="button" class="md-icon-button"
                   @click="$refs.attachmentInput.click()"
                   :disabled="sending"
                   aria-label="Attach encrypted files" title="Attach files">
          <md-icon>attach_file</md-icon>
        </md-button>
        <label class="sr-only" for="encrypted-chat-message">Encrypted message</label>
        <textarea id="encrypted-chat-message" v-model="newMessage"
                  placeholder="Write an encrypted message..."
                  @keydown.enter.exact.prevent="sendMessage"></textarea>
        <md-button type="submit" class="md-icon-button md-primary"
                   :disabled="!canSend" aria-label="Send encrypted message" title="Send">
          <md-icon>send</md-icon>
        </md-button>
      </div>
    </form>
  </template>
</section>
`;
