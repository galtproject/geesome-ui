module.exports = `
<div id="activitypub-sources-page" class="container-page activitypub-sources-page">
  <md-card>
    <md-card-header>
      <div class="md-title activitypub-sources-title">
        <h1 class="md-title activitypub-sources-heading">ActivityPub Sources</h1>
        <md-button class="md-icon-button md-primary" @click="refreshSources" :disabled="loadingSources || actionLoading" aria-label="Refresh ActivityPub sources">
          <md-icon class="fas fa-sync-alt"></md-icon>
          <md-tooltip>Refresh</md-tooltip>
        </md-button>
      </div>
    </md-card-header>

    <md-card-content>
      <div class="activitypub-sources-subscribe">
        <md-field>
          <label>Source</label>
          <md-select v-model="sourceType" :disabled="actionLoading">
            <md-option value="bluesky-official">@bsky.app via Bridgy Fed</md-option>
            <md-option value="handle">ActivityPub handle</md-option>
            <md-option value="actor-url">Actor URL</md-option>
            <md-option value="resource">WebFinger resource</md-option>
          </md-select>
        </md-field>

        <md-field v-if="sourceType !== 'bluesky-official'">
          <label>Handle or URL</label>
          <md-input v-model="sourceValue" :disabled="actionLoading"></md-input>
        </md-field>

        <md-field>
          <label>Display name</label>
          <md-input v-model="sourceDisplayName" :disabled="actionLoading"></md-input>
        </md-field>

        <md-button class="md-raised md-accent activitypub-sources-subscribe-button" @click="subscribeSource" :disabled="subscribeDisabled">
          Subscribe source
        </md-button>
      </div>

      <md-progress-bar md-mode="indeterminate" v-if="loadingSources || loadingFeed || actionLoading"></md-progress-bar>
      <div class="activitypub-sources-error" v-if="errorMessage">{{errorMessage}}</div>
      <div class="activitypub-sources-success" v-if="successMessage">{{successMessage}}</div>
    </md-card-content>
  </md-card>

  <md-card>
    <md-card-content>
      <div class="activitypub-sources-empty" v-if="!loadingSources && !hasSources">No ActivityPub sources subscribed yet</div>

      <div class="activitypub-sources-layout" v-if="hasSources">
        <div class="activitypub-source-list">
          <button
            v-for="source in sources"
            :key="source.id"
            type="button"
            :class="{'activitypub-source-list-item': true, active: selectedSource && selectedSource.id === source.id}"
            @click="selectSource(source)">
            <span class="activitypub-source-avatar">{{getSourceInitials(source)}}</span>
            <span class="activitypub-source-list-text">
              <strong>{{getSourceTitle(source)}}</strong>
              <small>{{getSourceMeta(source)}}</small>
              <small>{{getSourceLastReadText(source)}}</small>
            </span>
            <span class="activitypub-source-list-side">
              <span :class="getSourceStatusClass(source)">{{source.status || 'active'}}</span>
              <span class="activitypub-source-unread" v-if="getSourceUnreadCount(source)">{{getSourceUnreadCount(source)}}</span>
            </span>
          </button>
        </div>

        <div class="activitypub-source-feed" v-if="selectedSource">
          <div class="activitypub-source-feed-header">
            <div>
              <h2>{{getSourceTitle(selectedSource)}}</h2>
              <div class="activitypub-sources-muted">{{getSourceMeta(selectedSource)}}</div>
              <div class="activitypub-sources-muted">{{getSourceLastReadText(selectedSource)}}</div>
            </div>
            <span :class="getSourceStatusClass(selectedSource)">{{selectedSource.status || 'active'}}</span>
          </div>

          <div class="activitypub-source-feed-actions">
            <md-button class="md-primary" @click="refreshFeed" :disabled="loadingFeed || actionLoading">
              <md-icon class="fas fa-sync-alt"></md-icon>
              <span>Refresh feed</span>
            </md-button>
            <md-button class="md-primary" @click="markSelectedSourceRead" :disabled="loadingFeed || actionLoading || !hasFeedItems">
              <md-icon class="fas fa-check-double"></md-icon>
              <span>Mark read</span>
            </md-button>
            <md-button class="md-primary" @click="setSelectedSourceStatus('active')" :disabled="actionLoading || selectedSourceActive">
              <md-icon class="fas fa-play"></md-icon>
              <span>Resume</span>
            </md-button>
            <md-button class="md-primary" @click="setSelectedSourceStatus('paused')" :disabled="actionLoading || selectedSourcePaused">
              <md-icon class="fas fa-pause"></md-icon>
              <span>Pause</span>
            </md-button>
            <md-button class="md-warn" @click="removeSelectedSource" :disabled="actionLoading">
              <md-icon class="fas fa-trash"></md-icon>
              <span>Remove</span>
            </md-button>
          </div>

          <div class="activitypub-sources-empty" v-if="!loadingFeed && !hasFeedItems">No remote posts received yet</div>

          <article
            v-for="item in feedItems"
            :key="item.id"
            :class="{'activitypub-feed-item': true, unread: item.isUnread}">
            <div class="activitypub-feed-item-header">
              <div>
                <h3>{{getFeedItemTitle(item)}}</h3>
                <div class="activitypub-sources-muted">{{getFeedItemMeta(item)}}</div>
              </div>
              <div class="activitypub-feed-item-states">
                <span class="activitypub-source-unread" v-if="item.isUnread">Unread</span>
                <span :class="getFeedItemReviewClass(item)">{{item.reviewState || 'pending'}}</span>
              </div>
            </div>

            <div class="activitypub-feed-text">{{getFeedItemText(item)}}</div>
            <a class="activitypub-feed-link" v-if="getFeedItemUrl(item)" :href="getFeedItemUrl(item)" target="_blank" rel="noopener noreferrer">{{getFeedItemUrl(item)}}</a>

            <div class="activitypub-feed-attachments" v-if="item.preview && item.preview.attachments && item.preview.attachments.length">
              <div :class="getAttachmentClass(attachment)" v-for="attachment in item.preview.attachments" :key="attachment.url || attachment.name">
                <strong>{{getAttachmentLabel(attachment)}}</strong>
                <small>{{getAttachmentMeta(attachment)}}</small>
              </div>
            </div>
          </article>
        </div>
      </div>
    </md-card-content>
  </md-card>
</div>
`;
