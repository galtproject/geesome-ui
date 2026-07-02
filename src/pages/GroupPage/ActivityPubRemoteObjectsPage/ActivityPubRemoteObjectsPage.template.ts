module.exports = `
<div id="activitypub-review-page" class="activitypub-review-page">
  <md-card>
    <md-card-header>
      <div class="md-title activitypub-review-title">
        <h1 class="md-title activitypub-review-heading">ActivityPub reviews</h1>
        <md-button class="md-icon-button md-primary" @click="refreshRemoteObjects" :disabled="loading" aria-label="Refresh ActivityPub reviews">
          <md-icon class="fas fa-sync-alt"></md-icon>
          <md-tooltip>Refresh</md-tooltip>
        </md-button>
      </div>
    </md-card-header>

    <md-card-content class="activitypub-review-tabs">
      <md-tabs class="simple-tabs" :md-active-tab="reviewState" @md-changed="setReviewTab">
        <md-tab id="pending" md-label="Pending"></md-tab>
        <md-tab id="accepted" md-label="Accepted"></md-tab>
        <md-tab id="rejected" md-label="Rejected"></md-tab>
      </md-tabs>
    </md-card-content>

    <md-card-content>
      <md-progress-bar md-mode="indeterminate" v-if="loading || postDraftLoading || actionLoading"></md-progress-bar>
      <div class="activitypub-review-error" v-if="errorMessage">{{errorMessage}}</div>
      <div class="activitypub-review-empty" v-if="!loading && !hasRemoteObjects">No remote objects</div>

      <div class="activitypub-review-layout" v-if="hasRemoteObjects">
        <div class="activitypub-review-list">
          <button
            v-for="remoteObject in remoteObjects"
            :key="remoteObject.id"
            type="button"
            :class="{'activitypub-review-list-item': true, active: selectedRemoteObject && selectedRemoteObject.id === remoteObject.id}"
            @click="selectRemoteObject(remoteObject)">
            <span :class="getReviewStateClass(remoteObject)">{{remoteObject.reviewState || 'pending'}}</span>
            <strong>{{getObjectTitle(remoteObject)}}</strong>
            <small>{{getObjectMeta(remoteObject)}}</small>
          </button>
        </div>

        <div class="activitypub-review-detail" v-if="selectedRemoteObject">
          <div class="activitypub-review-detail-header">
            <div>
              <h2>{{getObjectTitle(selectedRemoteObject)}}</h2>
              <div class="activitypub-review-muted">{{getObjectMeta(selectedRemoteObject)}}</div>
            </div>
            <span :class="getReviewStateClass(selectedRemoteObject)">{{selectedRemoteObject.reviewState || 'pending'}}</span>
          </div>

          <div class="activitypub-review-preview">
            <h3>Preview</h3>
            <div class="activitypub-review-preview-text">{{selectedPreview.contentText || selectedPreview.summaryText || 'No text preview'}}</div>
            <div class="activitypub-review-muted" v-if="selectedPreview.url">{{selectedPreview.url}}</div>
          </div>

          <div class="activitypub-review-attachments" v-if="selectedAttachments.length">
            <h3>Attachments</h3>
            <div :class="getAttachmentClass(attachment)" v-for="attachment in selectedAttachments" :key="attachment.url">
              <strong>{{getAttachmentLabel(attachment)}}</strong>
              <small>{{getAttachmentMeta(attachment)}}</small>
            </div>
          </div>

          <div class="activitypub-review-policy">
            <h3>Import policy</h3>
            <div>{{getImportPolicyText()}}</div>
            <md-checkbox v-model="importRemoteAttachments" :disabled="!canCreatePost || !canModerateRemoteObjects">
              Back up supported attachments
            </md-checkbox>
          </div>

          <div class="activitypub-review-state">
            <h3>Post readiness</h3>
            <div>{{getDraftReasonsText()}}</div>
            <div class="activitypub-review-muted" v-if="!canModerateRemoteObjects">AdminAll permission required for review actions.</div>
            <div class="activitypub-review-success" v-if="getCreatedPostText()">{{getCreatedPostText()}}</div>
          </div>

          <div class="activitypub-review-actions">
            <md-button class="md-primary" @click="updateReviewState('accepted')" :disabled="actionLoading || !canModerateRemoteObjects || selectedRemoteObject.reviewState === 'accepted'">
              Accept
            </md-button>
            <md-button class="md-warn" @click="updateReviewState('rejected')" :disabled="actionLoading || !canModerateRemoteObjects || selectedRemoteObject.reviewState === 'rejected'">
              Reject
            </md-button>
            <md-button class="md-raised md-accent" @click="createRemotePost" :disabled="actionLoading || !canModerateRemoteObjects || !canCreatePost">
              Create post
            </md-button>
          </div>
        </div>
      </div>
    </md-card-content>
  </md-card>
</div>
`;
