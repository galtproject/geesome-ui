module.exports = `
<md-card class="post-card">
  <md-card-header>
    <div class="md-layout" style="justify-content: space-between;">
      <div class="md-subhead">
        <router-link :to="{name: 'group-page', params: {groupId: value.groupId}}">{{localGroup ? '@' + localGroup.name : '...'}}
        </router-link>
      </div>
      <div>
        <router-link :to="{name: 'group-post-page', params: {postId: value.id, groupId: value.groupId}}">{{date}}
        </router-link>
        <md-button v-if="cybActive" class="md-icon-button" @click="link">
          <md-icon class="fas fa-link"></md-icon>
        </md-button>
      </div>
    </div>
  </md-card-header>

  <md-card-content v-for="content in contentsList">
    <div class="post-rich-text" v-if="content.view !== 'link' && isRichTextContent(content)" v-html="renderRichTextContent(content)"></div>
    <content-manifest-item :manifest="content.storageId" v-else-if="content.view !== 'link'"></content-manifest-item>
  </md-card-content>

  <md-card-actions class="bluesky-cross-post-controls" v-if="showBlueskyControls">
    <div class="bluesky-cross-post-content">
      <md-progress-bar md-mode="indeterminate" v-if="blueskyLoadingAccounts || blueskyActionLoading"></md-progress-bar>

      <div class="bluesky-cross-post-empty" v-if="!blueskyLoadingAccounts && !hasBlueskyAccounts">
        No Bluesky account connected
      </div>

      <div class="bluesky-cross-post-form" v-if="hasBlueskyAccounts">
        <md-field>
          <label>Bluesky account</label>
          <md-select v-model="selectedBlueskyAccountId" :disabled="blueskyActionLoading">
            <md-option v-for="account in blueskyAccounts" :key="account.id" :value="account.id">
              {{getBlueskyAccountLabel(account)}}
            </md-option>
          </md-select>
        </md-field>

        <md-field v-if="selectedBlueskyAccount && selectedBlueskyAccount.isEncrypted">
          <label>App password</label>
          <md-input v-model="blueskyAppPassword" type="password" :disabled="blueskyActionLoading"></md-input>
        </md-field>

        <a class="bluesky-cross-post-link" v-if="selectedBlueskyRecordUrl" :href="selectedBlueskyRecordUrl" target="_blank" rel="noopener noreferrer">
          Open Bluesky post
        </a>

        <div class="bluesky-cross-post-relation-notice" v-if="blueskyRelationNotice">
          {{blueskyRelationNotice}}
        </div>

        <div class="bluesky-cross-post-policy" aria-label="Bluesky cross-post policy">
          <md-field>
            <label>Images</label>
            <md-select v-model="blueskyMediaPolicy.images" :disabled="blueskyActionLoading">
              <md-option value="upload">Upload blobs</md-option>
              <md-option value="link">Public links</md-option>
              <md-option value="reject">Reject images</md-option>
            </md-select>
          </md-field>

          <md-field>
            <label>Upload failure</label>
            <md-select v-model="blueskyMediaPolicy.imageUploadFailure" :disabled="blueskyActionLoading">
              <md-option value="link">Use public link</md-option>
              <md-option value="reject">Reject post</md-option>
            </md-select>
          </md-field>

          <md-field>
            <label>Attachments</label>
            <md-select v-model="blueskyMediaPolicy.attachments" :disabled="blueskyActionLoading">
              <md-option value="card">External card</md-option>
              <md-option value="link">Links only</md-option>
              <md-option value="reject">Reject attachments</md-option>
              <md-option value="ignore">Ignore attachments</md-option>
            </md-select>
          </md-field>

          <md-field>
            <label>Link previews</label>
            <md-select v-model="blueskyMediaPolicy.linkPreviews" :disabled="blueskyActionLoading">
              <md-option value="card">External card</md-option>
              <md-option value="link">Links only</md-option>
              <md-option value="reject">Reject previews</md-option>
              <md-option value="ignore">Ignore previews</md-option>
            </md-select>
          </md-field>

          <md-field>
            <label>Replies</label>
            <md-select v-model="blueskyRelationPolicy.replies" :disabled="blueskyActionLoading">
              <md-option value="require">Require Bluesky identity</md-option>
              <md-option value="omit">Omit reply metadata</md-option>
            </md-select>
          </md-field>

          <md-field>
            <label>Quotes</label>
            <md-select v-model="blueskyRelationPolicy.quotes" :disabled="blueskyActionLoading">
              <md-option value="require">Require Bluesky identity</md-option>
              <md-option value="omit">Omit quote metadata</md-option>
            </md-select>
          </md-field>
        </div>

        <md-button class="md-primary" v-if="!selectedBlueskyRecord" @click="crossPostToBluesky" :disabled="blueskyActionDisabled">
          <md-icon class="fas fa-share"></md-icon>
          <span>Post to Bluesky</span>
        </md-button>
        <md-button class="md-primary" v-if="selectedBlueskyRecord" @click="updateBlueskyCrossPost" :disabled="blueskyActionDisabled">
          <md-icon class="fas fa-sync-alt"></md-icon>
          <span>Update Bluesky</span>
        </md-button>
        <md-button class="md-warn" v-if="selectedBlueskyRecord" @click="deleteBlueskyCrossPost" :disabled="blueskyActionDisabled">
          <md-icon class="fas fa-trash"></md-icon>
          <span>Delete Bluesky</span>
        </md-button>
      </div>

      <div class="bluesky-cross-post-error" v-if="blueskyErrorMessage">{{blueskyErrorMessage}}</div>
      <div class="bluesky-cross-post-success" v-if="blueskySuccessMessage">{{blueskySuccessMessage}}</div>
    </div>
  </md-card-actions>
</md-card>
`;
