/*
 * Copyright ©️ 2018-2020 Galt•Project Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka)
 *
 * Copyright ©️ 2018-2020 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) by
 * [Basic Agreement](ipfs/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS)).
 */

export default {
  template: require('./ActivityPubRemoteObjectsPage.template'),
  props: ['group'],
  async created() {
    await this.refreshCanModerateRemoteObjects();
    await this.refreshRemoteObjects();
  },
  methods: {
    async refreshCanModerateRemoteObjects() {
      if (!this.$geesome.adminIsHaveCorePermission) {
        this.canModerateRemoteObjects = false;
        return;
      }

      this.canModerateRemoteObjects = await this.$geesome.adminIsHaveCorePermission('admin:all').catch(() => false);
    },
    async refreshRemoteObjects() {
      if (!this.groupName) {
        return;
      }

      this.loading = true;
      this.errorMessage = null;

      try {
        const page = await this.$geesome.adminGetActivityPubRemoteObjects(this.groupName, {
          reviewState: this.reviewState,
          limit: this.pageLimit,
          offset: 0
        });
        this.remoteObjects = page && Array.isArray(page.list) ? page.list : [];
        this.total = page && page.total ? page.total : this.remoteObjects.length;
        await this.selectDefaultRemoteObject();
      } catch (e) {
        this.errorMessage = getErrorMessage(e);
      }

      this.loading = false;
    },
    async selectDefaultRemoteObject() {
      if (!this.remoteObjects.length) {
        this.selectedRemoteObject = null;
        this.postDraft = null;
        return;
      }

      const selectedId = this.selectedRemoteObject && this.selectedRemoteObject.id;
      const selectedInPage = this.remoteObjects.find((item) => item.id === selectedId);
      await this.selectRemoteObject(selectedInPage || this.remoteObjects[0]);
    },
    async selectRemoteObject(remoteObject) {
      this.selectedRemoteObject = remoteObject || null;
      this.createdPostResult = null;
      await this.refreshPostDraft();
    },
    async refreshPostDraft() {
      if (!this.groupName || !this.selectedRemoteObject) {
        this.postDraft = null;
        return;
      }

      this.postDraftLoading = true;
      try {
        this.postDraft = await this.$geesome.adminGetActivityPubRemoteObjectPostDraft(this.groupName, this.selectedRemoteObject.id);
      } catch (e) {
        this.postDraft = null;
        this.errorMessage = getErrorMessage(e);
      }
      this.postDraftLoading = false;
    },
    async setReviewTab(reviewState) {
      this.reviewState = reviewState;
      await this.refreshRemoteObjects();
    },
    async updateReviewState(state) {
      if (!this.selectedRemoteObject || !this.canModerateRemoteObjects) {
        return;
      }

      this.actionLoading = true;
      this.errorMessage = null;

      try {
        this.selectedRemoteObject = await this.$geesome.adminSetActivityPubRemoteObjectReviewState(
          this.groupName,
          this.selectedRemoteObject.id,
          {state}
        );
        this.reviewState = state;
        await this.refreshPostDraft();
        await this.refreshRemoteObjects();
      } catch (e) {
        this.errorMessage = getErrorMessage(e);
      }

      this.actionLoading = false;
    },
    async createRemotePost() {
      if (!this.selectedRemoteObject || !this.canCreatePost || !this.canModerateRemoteObjects) {
        return;
      }

      this.actionLoading = true;
      this.errorMessage = null;

      try {
        this.createdPostResult = await this.$geesome.adminCreateActivityPubRemoteObjectPost(
          this.groupName,
          this.selectedRemoteObject.id,
          {importRemoteAttachments: this.importRemoteAttachments}
        );
        if (this.createdPostResult && this.createdPostResult.remoteObject) {
          this.selectedRemoteObject = this.createdPostResult.remoteObject;
        }
        await this.refreshPostDraft();
      } catch (e) {
        this.errorMessage = getErrorMessage(e);
      }

      this.actionLoading = false;
    },
    getObjectTitle(remoteObject) {
      return getObjectTitle(remoteObject);
    },
    getObjectMeta(remoteObject) {
      return getObjectMeta(remoteObject);
    },
    getReviewStateClass(remoteObject) {
      return `activitypub-review-badge review-${remoteObject && remoteObject.reviewState || 'pending'}`;
    },
    getDraftReasonsText() {
      const reasons = this.postDraft && Array.isArray(this.postDraft.reasons) ? this.postDraft.reasons : [];
      return reasons.length ? reasons.join(', ') : 'Ready to create';
    },
    getAttachmentLabel(attachment) {
      return getAttachmentLabel(attachment);
    },
    getAttachmentMeta(attachment) {
      return getAttachmentMeta(attachment);
    },
    getAttachmentClass(attachment) {
      return `activitypub-attachment attachment-${attachment && attachment.mediaCategory || 'unknown'}`;
    },
    getImportPolicyText() {
      return getImportPolicyText(this.postDraft && this.postDraft.attachmentImportPolicy);
    },
    getCreatedPostText() {
      const post = this.createdPostResult && this.createdPostResult.post;
      if (!post) {
        return '';
      }
      return `Imported post #${post.id}`;
    }
  },
  watch: {
    groupName() {
      this.refreshRemoteObjects();
    }
  },
  computed: {
    groupName() {
      return this.group && this.group.name;
    },
    selectedPreview() {
      return this.selectedRemoteObject && this.selectedRemoteObject.preview || {};
    },
    selectedAttachments() {
      return this.postDraft && Array.isArray(this.postDraft.attachments) ? this.postDraft.attachments : [];
    },
    canCreatePost() {
      return !!(this.postDraft && this.postDraft.canCreatePost && !this.selectedRemoteObject.localPostId);
    },
    hasRemoteObjects() {
      return this.remoteObjects.length > 0;
    }
  },
  data() {
    return {
      remoteObjects: [],
      selectedRemoteObject: null,
      postDraft: null,
      createdPostResult: null,
      reviewState: 'pending',
      pageLimit: 20,
      total: 0,
      importRemoteAttachments: false,
      canModerateRemoteObjects: false,
      loading: false,
      postDraftLoading: false,
      actionLoading: false,
      errorMessage: null
    };
  }
}

function getObjectTitle(remoteObject) {
  const preview = remoteObject && remoteObject.preview || {};
  return preview.name || preview.contentText || remoteObject && remoteObject.objectId || `Remote object #${remoteObject && remoteObject.id}`;
}

function getObjectMeta(remoteObject) {
  const parts = [
    remoteObject && remoteObject.objectType,
    remoteObject && remoteObject.visibility,
    remoteObject && remoteObject.remoteActor && remoteObject.remoteActor.preferredUsername
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : '';
}

function getAttachmentLabel(attachment) {
  return attachment && (attachment.name || attachment.url) || 'Attachment';
}

function getAttachmentMeta(attachment) {
  const parts = [
    attachment && attachment.mediaCategory,
    attachment && attachment.mediaType,
    attachment && attachment.width && attachment.height ? `${attachment.width}x${attachment.height}` : null
  ].filter(Boolean);
  return parts.join(' · ');
}

function getImportPolicyText(policy) {
  if (!policy) {
    return 'No attachment policy';
  }

  const modes = Array.isArray(policy.supportedModes) ? policy.supportedModes.join(', ') : policy.mode;
  return `Default ${policy.defaultMode || policy.mode}; supported ${modes}`;
}

function getErrorMessage(error) {
  return error && error.message ? error.message : String(error || 'unknown_error');
}
