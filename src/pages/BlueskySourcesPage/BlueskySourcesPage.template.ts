module.exports = `
<div id="bluesky-sources-page" class="container-page activitypub-sources-page bluesky-sources-page">
  <md-card>
    <md-card-header>
      <div class="md-title activitypub-sources-title">
        <h1 class="md-title activitypub-sources-heading">Bluesky Sources</h1>
        <md-button class="md-icon-button md-primary" @click="refreshSources" :disabled="loadingSources || actionLoading" aria-label="Refresh Bluesky sources">
          <md-icon class="fas fa-sync-alt"></md-icon>
          <md-tooltip>Refresh</md-tooltip>
        </md-button>
      </div>
    </md-card-header>

    <md-card-content>
      <div class="activitypub-sources-subscribe bluesky-sources-subscribe">
        <md-field>
          <label>Handle or DID</label>
          <md-input v-model="sourceActor" :disabled="actionLoading"></md-input>
        </md-field>

        <md-field>
          <label>Feed filter</label>
          <md-select v-model="sourceFilter" :disabled="actionLoading">
            <md-option value="posts_no_replies">Posts only</md-option>
            <md-option value="posts_with_replies">Posts with replies</md-option>
            <md-option value="posts_with_media">Posts with media</md-option>
            <md-option value="posts_and_author_threads">Author threads</md-option>
          </md-select>
        </md-field>

        <md-field>
          <label>Display name</label>
          <md-input v-model="sourceDisplayName" :disabled="actionLoading"></md-input>
        </md-field>

        <md-field>
          <label>Group name</label>
          <md-input v-model="sourceGroupName" :disabled="actionLoading"></md-input>
        </md-field>

        <md-field>
          <label>Import limit</label>
          <md-input v-model="sourceImportLimit" type="number" min="1" max="100" :disabled="actionLoading"></md-input>
        </md-field>

        <md-field>
          <label>Moderation</label>
          <md-select v-model="moderationMode" :disabled="actionLoading">
            <md-option value="autoImport">Auto import</md-option>
            <md-option value="reviewFirst">Review first</md-option>
          </md-select>
        </md-field>

        <md-button class="md-raised md-accent activitypub-sources-subscribe-button" @click="subscribeSource" :disabled="subscribeDisabled">
          Subscribe source
        </md-button>
      </div>

      <div class="bluesky-rule-builder">
        <md-field>
          <label>Rule value</label>
          <md-input v-model="newRule.value" :disabled="actionLoading"></md-input>
        </md-field>

        <md-field>
          <label>Type</label>
          <md-select v-model="newRule.type" :disabled="actionLoading">
            <md-option value="keyword">Keyword</md-option>
            <md-option value="regex">Regex</md-option>
          </md-select>
        </md-field>

        <md-field>
          <label>Field</label>
          <md-select v-model="newRule.field" :disabled="actionLoading">
            <md-option value="text">Post text</md-option>
            <md-option value="source">Source</md-option>
            <md-option value="groupName">Group name</md-option>
          </md-select>
        </md-field>

        <md-field>
          <label>Action</label>
          <md-select v-model="newRule.action" :disabled="actionLoading">
            <md-option value="block">Block</md-option>
            <md-option value="quarantine">Quarantine</md-option>
            <md-option value="review">Review</md-option>
          </md-select>
        </md-field>

        <md-button class="md-primary" @click="addModerationRule" :disabled="actionLoading || !newRule.value.trim()">
          <md-icon class="fas fa-filter"></md-icon>
          <span>Add filter</span>
        </md-button>
      </div>

      <div class="bluesky-rules-list" v-if="moderationRules.length">
        <div class="bluesky-rule-chip" v-for="(rule, index) in moderationRules" :key="index">
          <span>{{getRuleLabel(rule)}}</span>
          <md-button class="md-icon-button md-dense" @click="removeModerationRule(index)" :disabled="actionLoading" :aria-label="'Remove ' + getRuleLabel(rule)">
            <md-icon class="fas fa-times"></md-icon>
          </md-button>
        </div>
      </div>

      <md-progress-bar md-mode="indeterminate" v-if="loadingSources || loadingFeed || actionLoading"></md-progress-bar>
      <div class="activitypub-sources-error" v-if="errorMessage">{{errorMessage}}</div>
      <div class="activitypub-sources-success" v-if="successMessage">{{successMessage}}</div>
    </md-card-content>
  </md-card>

  <md-card>
    <md-card-content>
      <div class="activitypub-sources-empty" v-if="!loadingSources && !hasSources">No Bluesky sources subscribed yet</div>

      <div class="activitypub-sources-layout" v-if="hasSources">
        <div class="activitypub-source-list">
          <button
            v-for="source in sources"
            :key="source.id"
            type="button"
            :class="{'activitypub-source-list-item': true, active: selectedSource && selectedSource.id === source.id}"
            @click="selectSource(source)">
            <span class="activitypub-source-avatar bluesky-source-avatar">{{getSourceInitials(source)}}</span>
            <span class="activitypub-source-list-text">
              <strong>{{getSourceTitle(source)}}</strong>
              <small>{{getSourceMeta(source)}}</small>
              <small>{{getSourceRefreshText(source)}}</small>
            </span>
            <span class="activitypub-source-list-side">
              <span :class="getSourceStatusClass(source)">{{source.status || 'active'}}</span>
              <span class="activitypub-source-unread" v-if="source.lastError">Error</span>
            </span>
          </button>
        </div>

        <div class="activitypub-source-feed" v-if="selectedSource">
          <div class="activitypub-source-feed-header">
            <div>
              <h2>{{getSourceTitle(selectedSource)}}</h2>
              <div class="activitypub-sources-muted">{{getSourceMeta(selectedSource)}}</div>
              <div class="activitypub-sources-muted">{{getSourceRefreshText(selectedSource)}}</div>
              <div class="activitypub-sources-error" v-if="selectedSource.lastError">{{selectedSource.lastError}}</div>
            </div>
            <span :class="getSourceStatusClass(selectedSource)">{{selectedSource.status || 'active'}}</span>
          </div>

          <div class="activitypub-source-feed-actions">
            <md-button class="md-primary" @click="refreshSelectedSourceFromRemote" :disabled="loadingFeed || actionLoading">
              <md-icon class="fas fa-cloud-download-alt"></md-icon>
              <span>Refresh from Bluesky</span>
            </md-button>
            <md-button class="md-primary" @click="refreshFeed" :disabled="loadingFeed || actionLoading">
              <md-icon class="fas fa-sync-alt"></md-icon>
              <span>Reload feed</span>
            </md-button>
            <md-button class="md-primary" @click="syncSelectedSource" :disabled="loadingFeed || actionLoading || !selectedSource.dbChannelId">
              <md-icon class="fas fa-exchange-alt"></md-icon>
              <span>Sync imported posts</span>
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

          <div class="activitypub-sources-empty" v-if="!loadingFeed && !hasFeedItems">No imported Bluesky posts yet</div>

          <article
            v-for="item in feedItems"
            :key="item.id"
            class="activitypub-feed-item bluesky-feed-item">
            <div class="activitypub-feed-item-header">
              <div>
                <h3>{{getFeedItemTitle(item)}}</h3>
                <div class="activitypub-sources-muted">{{getFeedItemMeta(item)}}</div>
              </div>
              <div class="activitypub-feed-item-states">
                <span :class="getPostStatusClass(item)">{{item.status || 'published'}}</span>
              </div>
            </div>

            <div class="activitypub-feed-text">{{getFeedItemText(item)}}</div>
            <a class="activitypub-feed-link" v-if="getFeedItemUrl(item)" :href="getFeedItemUrl(item)" target="_blank" rel="noopener noreferrer">{{getFeedItemUrl(item)}}</a>
          </article>
        </div>
      </div>
    </md-card-content>
  </md-card>
</div>
`;
