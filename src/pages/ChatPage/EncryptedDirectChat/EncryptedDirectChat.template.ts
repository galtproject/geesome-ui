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
    <md-button class="md-icon-button" @click="refresh" :disabled="loading"
               aria-label="Refresh encrypted messages" title="Refresh">
      <md-icon>refresh</md-icon>
    </md-button>
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

  <template v-else-if="localDevice && recipientReady">
    <div class="encrypted-direct-chat-messages" role="log" aria-live="polite">
      <div v-if="!messages.length && !loading" class="encrypted-direct-chat-empty is-compact">
        <md-icon>forum</md-icon>
        <h3>No encrypted messages yet</h3>
        <p>Messages sent here are ciphertext everywhere outside your browsers.</p>
      </div>
      <article v-for="message in messages" :key="message.messageId"
               class="encrypted-direct-chat-message"
               :class="{'is-own': message.isOwn}">
        <div class="encrypted-direct-chat-message-text">{{message.text}}</div>
        <footer>
          <time :datetime="message.createdAt">{{formatDate(message.createdAt)}}</time>
          <span v-if="message.isOwn">{{message.deliveryLabel}}</span>
        </footer>
      </article>
    </div>

    <form class="encrypted-direct-chat-composer" @submit.prevent="sendMessage">
      <label class="sr-only" for="encrypted-chat-message">Encrypted message</label>
      <textarea id="encrypted-chat-message" v-model="newMessage"
                placeholder="Write an encrypted message..."
                @keydown.enter.exact.prevent="sendMessage"></textarea>
      <md-button type="submit" class="md-icon-button md-primary"
                 :disabled="!canSend" aria-label="Send encrypted message" title="Send">
        <md-icon>send</md-icon>
      </md-button>
    </form>
  </template>
</section>
`;
