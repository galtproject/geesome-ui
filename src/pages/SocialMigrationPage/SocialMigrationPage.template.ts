module.exports = `
<div id="social-migration-page" class="container-page social-migration-page activitypub-sources-page">
  <md-card>
    <md-card-header>
      <div class="md-title activitypub-sources-title">
        <h1 class="md-title activitypub-sources-heading">Social Migration</h1>
      </div>
    </md-card-header>

    <md-card-content>
      <div class="social-migration-form">
        <md-field>
          <label>Source type</label>
          <md-select v-model="sourceType" :disabled="loading">
            <md-option value="bluesky">Native Bluesky</md-option>
            <md-option value="activitypub">ActivityPub</md-option>
          </md-select>
        </md-field>

        <template v-if="!isActivityPub">
          <md-field>
            <label>Bluesky handle or DID</label>
            <md-input v-model="blueskyActor" :disabled="loading"></md-input>
          </md-field>

          <md-field>
            <label>Stored Bluesky account</label>
            <md-select v-model="selectedBlueskyAccountId" :disabled="loading">
              <md-option v-for="account in blueskyAccounts" :key="account.id" :value="account.id">
                {{account.fullName || account.username || account.accountId}}
              </md-option>
            </md-select>
          </md-field>

          <md-field>
            <label>Feed filter</label>
            <md-select v-model="blueskyFilter" :disabled="loading">
              <md-option value="posts_with_replies">Posts with replies</md-option>
              <md-option value="posts_no_replies">Posts only</md-option>
              <md-option value="posts_with_media">Posts with media</md-option>
              <md-option value="posts_and_author_threads">Author threads</md-option>
            </md-select>
          </md-field>
        </template>

        <template v-if="isActivityPub">
          <md-field>
            <label>ActivityPub source</label>
            <md-select v-model="activityPubInputType" :disabled="loading">
              <md-option value="handle">Handle</md-option>
              <md-option value="actor-url">Actor URL</md-option>
              <md-option value="resource">WebFinger resource</md-option>
              <md-option value="bluesky-bridge">@bsky.app via Bridgy Fed</md-option>
            </md-select>
          </md-field>

          <md-field v-if="activityPubInputType !== 'bluesky-bridge'">
            <label>Handle, URL, or resource</label>
            <md-input v-model="activityPubSource" :disabled="loading"></md-input>
          </md-field>

          <md-field>
            <label>Ownership proof token</label>
            <md-input v-model="ownershipProofToken" :disabled="loading"></md-input>
          </md-field>
        </template>

        <md-field>
          <label>Target group name</label>
          <md-input v-model="targetGroupName" :disabled="loading"></md-input>
        </md-field>

        <md-field>
          <label>Moderation</label>
          <md-select v-model="moderationMode" :disabled="loading">
            <md-option value="autoImport">Auto import</md-option>
            <md-option value="reviewFirst">Review first</md-option>
          </md-select>
        </md-field>

        <md-field>
          <label>Limit</label>
          <md-input v-model="limit" type="number" min="1" max="100" :disabled="loading"></md-input>
        </md-field>

        <md-field>
          <label>Max pages</label>
          <md-input v-model="maxPages" type="number" min="1" max="25" :disabled="loading"></md-input>
        </md-field>
      </div>

      <div class="social-migration-rule-builder">
        <md-field>
          <label>Filter value</label>
          <md-input v-model="newRule.value" :disabled="loading"></md-input>
        </md-field>

        <md-field>
          <label>Type</label>
          <md-select v-model="newRule.type" :disabled="loading">
            <md-option value="keyword">Keyword</md-option>
            <md-option value="regex">Regex</md-option>
          </md-select>
        </md-field>

        <md-field>
          <label>Field</label>
          <md-select v-model="newRule.field" :disabled="loading">
            <md-option value="text">Post text</md-option>
            <md-option value="source">Source</md-option>
            <md-option value="groupName">Group name</md-option>
          </md-select>
        </md-field>

        <md-field>
          <label>Action</label>
          <md-select v-model="newRule.action" :disabled="loading">
            <md-option value="block">Block</md-option>
            <md-option value="quarantine">Quarantine</md-option>
            <md-option value="review">Review</md-option>
          </md-select>
        </md-field>

        <md-button class="md-primary" @click="addModerationRule" :disabled="loading || !newRule.value.trim()">
          <md-icon class="fas fa-filter"></md-icon>
          <span>Add filter</span>
        </md-button>
      </div>

      <div class="social-migration-rules-list" v-if="moderationRules.length">
        <div class="social-migration-rule-chip" v-for="(rule, index) in moderationRules" :key="index">
          <span>{{getRuleLabel(rule)}}</span>
          <md-button class="md-icon-button md-dense" @click="removeModerationRule(index)" :disabled="loading" :aria-label="'Remove ' + getRuleLabel(rule)">
            <md-icon class="fas fa-times"></md-icon>
          </md-button>
        </div>
      </div>

      <div class="social-migration-actions">
        <md-checkbox v-model="importAsync" :disabled="loading">Run as async job</md-checkbox>

        <md-button class="md-raised md-primary" @click="previewMigration" :disabled="previewDisabled">
          <md-icon class="fas fa-search"></md-icon>
          <span>Preview migration</span>
        </md-button>

        <md-button class="md-raised md-accent" @click="startMigration" :disabled="startDisabled">
          <md-icon class="fas fa-file-import"></md-icon>
          <span>Start import</span>
        </md-button>
      </div>

      <md-progress-bar md-mode="indeterminate" v-if="loading"></md-progress-bar>
      <div class="activitypub-sources-error" v-if="errorMessage">{{errorMessage}}</div>
      <div class="activitypub-sources-success" v-if="successMessage">{{successMessage}}</div>
    </md-card-content>
  </md-card>

  <md-card v-if="preview">
    <md-card-content>
      <div class="activitypub-source-feed-header">
        <div>
          <h2>{{preview.actor || preview.sourceActorUrl || blueskyActor}}</h2>
          <div class="activitypub-sources-muted">{{getOwnershipText()}}</div>
        </div>
        <span :class="{'activitypub-feed-state': true, 'review-accepted': preview.ownership && preview.ownership.verified, 'review-pending': !preview.ownership || !preview.ownership.verified}">
          {{preview.ownership && preview.ownership.verified ? 'verified' : 'unverified'}}
        </span>
      </div>

      <div class="social-migration-summary" v-if="getSummaryRows().length">
        <div class="social-migration-summary-item" v-for="row in getSummaryRows()" :key="row.key">
          <strong>{{row.value}}</strong>
          <span>{{row.key}}</span>
        </div>
      </div>

      <div class="activitypub-sources-empty" v-if="!hasPreviewItems">No migration records in this preview</div>

      <article class="activitypub-feed-item social-migration-preview-item" v-for="item in previewItems" :key="item.objectId || item.uri || item.id || item.postUri">
        <div class="activitypub-feed-item-header">
          <div>
            <h3>{{getPreviewTitle(item)}}</h3>
            <div class="activitypub-sources-muted">{{getPreviewMeta(item)}}</div>
          </div>
        </div>
        <div class="activitypub-feed-text" v-if="getPreviewText(item)">{{getPreviewText(item)}}</div>
      </article>
    </md-card-content>
  </md-card>

  <md-card v-if="importResult">
    <md-card-content>
      <h2>Import result</h2>
      <pre class="social-migration-result">{{JSON.stringify(importResult, null, 2)}}</pre>
    </md-card-content>
  </md-card>
</div>
`;
