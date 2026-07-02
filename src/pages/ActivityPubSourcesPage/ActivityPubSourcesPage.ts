/*
 * Copyright ©️ 2018-2020 Galt•Project Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka)
 *
 * Copyright ©️ 2018-2020 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) by
 * [Basic Agreement](ipfs/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS)).
 */

const activityPubSourceTypes = {
  BlueskyOfficial: 'bluesky-official',
  Handle: 'handle',
  ActorUrl: 'actor-url',
  Resource: 'resource'
};

export default {
  template: require('./ActivityPubSourcesPage.template'),
  props: [],
  async created() {
    await this.refreshSources();
  },
  methods: {
    async refreshSources() {
      this.loadingSources = true;
      this.errorMessage = null;

      try {
        const page = await this.$geesome.adminGetActivityPubSourceSubscriptions({
          limit: this.pageLimit,
          offset: 0
        });
        this.sources = page && Array.isArray(page.list) ? page.list : [];
        this.totalSources = page && page.total ? page.total : this.sources.length;
        await this.selectDefaultSource();
      } catch (e) {
        this.errorMessage = getErrorMessage(e, 'Could not load ActivityPub sources');
      }

      this.loadingSources = false;
    },
    async subscribeSource() {
      this.actionLoading = true;
      this.errorMessage = null;
      this.successMessage = null;

      try {
        const source = await this.$geesome.adminSubscribeActivityPubSource(this.getSourceInput());
        this.selectedSource = source;
        this.successMessage = `Subscribed ${this.getSourceTitle(source)}`;
        await this.refreshSources();
        await this.selectSourceById(source && source.id);
      } catch (e) {
        this.errorMessage = getErrorMessage(e, 'Could not subscribe to ActivityPub source');
      }

      this.actionLoading = false;
    },
    async selectDefaultSource() {
      if (!this.sources.length) {
        this.selectedSource = null;
        this.feedItems = [];
        this.feedTotal = 0;
        return;
      }

      const selectedId = this.selectedSource && this.selectedSource.id;
      await this.selectSourceById(selectedId || this.sources[0].id);
    },
    async selectSourceById(sourceId) {
      const source = this.sources.find(item => String(item.id) === String(sourceId));
      await this.selectSource(source || this.sources[0]);
    },
    async selectSource(source) {
      this.selectedSource = source || null;
      await this.refreshFeed();
    },
    async refreshFeed() {
      if (!this.selectedSource || !this.selectedSource.id) {
        this.feedItems = [];
        this.feedTotal = 0;
        return;
      }

      this.loadingFeed = true;
      this.errorMessage = null;

      try {
        const page = await this.$geesome.adminGetActivityPubSourceFeed(this.selectedSource.id, {
          limit: this.pageLimit,
          offset: 0
        });
        this.selectedSource = page && page.source ? page.source : this.selectedSource;
        this.feedItems = page && Array.isArray(page.list) ? page.list : [];
        this.feedTotal = page && page.total ? page.total : this.feedItems.length;
      } catch (e) {
        this.errorMessage = getErrorMessage(e, 'Could not load ActivityPub source feed');
      }

      this.loadingFeed = false;
    },
    async markSelectedSourceRead() {
      if (!this.selectedSource || !this.selectedSource.id) {
        return;
      }

      this.actionLoading = true;
      this.errorMessage = null;

      try {
        this.selectedSource = await this.$geesome.adminMarkActivityPubSourceRead(this.selectedSource.id, {});
        await this.refreshFeed();
      } catch (e) {
        this.errorMessage = getErrorMessage(e, 'Could not mark source read');
      }

      this.actionLoading = false;
    },
    async setSelectedSourceStatus(status) {
      if (!this.selectedSource || !this.selectedSource.id) {
        return;
      }

      this.actionLoading = true;
      this.errorMessage = null;

      try {
        this.selectedSource = await this.$geesome.adminUpdateActivityPubSourceSubscription(this.selectedSource.id, {status});
        await this.refreshSources();
      } catch (e) {
        this.errorMessage = getErrorMessage(e, 'Could not update source');
      }

      this.actionLoading = false;
    },
    async removeSelectedSource() {
      if (!this.selectedSource || !this.selectedSource.id) {
        return;
      }

      this.actionLoading = true;
      this.errorMessage = null;

      try {
        await this.$geesome.adminRemoveActivityPubSourceSubscription(this.selectedSource.id);
        this.selectedSource = null;
        this.feedItems = [];
        await this.refreshSources();
      } catch (e) {
        this.errorMessage = getErrorMessage(e, 'Could not remove source');
      }

      this.actionLoading = false;
    },
    getSourceInput() {
      const displayName = this.sourceDisplayName.trim();
      if (this.sourceType === activityPubSourceTypes.BlueskyOfficial) {
        return {
          preset: 'bluesky-official',
          displayName: displayName || '@bsky.app via Bridgy Fed'
        };
      }

      const input: any = {};
      if (displayName) {
        input.displayName = displayName;
      }
      if (this.sourceType === activityPubSourceTypes.ActorUrl) {
        input.actorUrl = this.sourceValue.trim();
      } else if (this.sourceType === activityPubSourceTypes.Resource) {
        input.resource = this.sourceValue.trim();
      } else {
        input.handle = this.sourceValue.trim();
        if (!input.handle.includes('@')) {
          input.bridgeProvider = 'bridgy-bluesky';
        }
      }
      return input;
    },
    getSourceTitle(source) {
      return getSourceTitle(source);
    },
    getSourceMeta(source) {
      return getSourceMeta(source);
    },
    getSourceInitials(source) {
      const title = this.getSourceTitle(source);
      return title.replace(/^@/, '').slice(0, 2).toUpperCase();
    },
    getSourceStatusClass(source) {
      return `activitypub-source-status status-${source && source.status || 'active'}`;
    },
    getSourceUnreadCount(source) {
      if (!this.selectedSource || !source || source.id !== this.selectedSource.id) {
        return readNumber(source && source.unreadCount);
      }
      return this.feedItems.filter(item => item && item.isUnread).length;
    },
    getSourceLastReadText(source) {
      if (!source || !source.lastReadAt) {
        return 'Unread from start';
      }
      return `Read ${formatUtcDateTime(source.lastReadAt)}`;
    },
    getFeedItemTitle(item) {
      const preview = item && item.preview || {};
      return preview.name || preview.contentText || item && item.objectId || `Remote item #${item && item.id}`;
    },
    getFeedItemText(item) {
      const preview = item && item.preview || {};
      return preview.contentText || preview.summaryText || 'No text preview';
    },
    getFeedItemMeta(item) {
      const actor = item && item.remoteActor || {};
      const parts = [
        actor.preferredUsername ? `@${actor.preferredUsername}` : actor.domain,
        item && item.objectType,
        item && item.visibility,
        formatUtcDateTime(item && item.publishedAt)
      ].filter(Boolean);
      return parts.join(' · ');
    },
    getFeedItemReviewClass(item) {
      return `activitypub-feed-state review-${item && item.reviewState || 'pending'}`;
    },
    getFeedItemUrl(item) {
      const preview = item && item.preview || {};
      return preview.url || item && (item.remoteObjectUrl || item.objectId) || '';
    },
    getAttachmentLabel(attachment) {
      return attachment && (attachment.name || attachment.url) || 'Attachment';
    },
    getAttachmentMeta(attachment) {
      return getAttachmentMeta(attachment);
    },
    getAttachmentClass(attachment) {
      return `activitypub-source-attachment attachment-${attachment && attachment.mediaCategory || 'unknown'}`;
    }
  },
  watch: {
    pageLimit() {
      this.refreshSources();
    },
    sourceType() {
      if (this.sourceType === activityPubSourceTypes.BlueskyOfficial) {
        this.sourceValue = 'bsky.app';
        this.sourceDisplayName = '@bsky.app via Bridgy Fed';
      } else if (this.sourceValue === 'bsky.app') {
        this.sourceValue = '';
        this.sourceDisplayName = '';
      }
    }
  },
  computed: {
    hasSources() {
      return this.sources.length > 0;
    },
    hasFeedItems() {
      return this.feedItems.length > 0;
    },
    subscribeDisabled() {
      if (this.actionLoading || this.loadingSources) {
        return true;
      }
      if (this.sourceType === activityPubSourceTypes.BlueskyOfficial) {
        return false;
      }
      return !this.sourceValue.trim();
    },
    selectedSourcePaused() {
      return this.selectedSource && this.selectedSource.status === 'paused';
    },
    selectedSourceActive() {
      return this.selectedSource && this.selectedSource.status === 'active';
    }
  },
  data() {
    return {
      sources: [],
      selectedSource: null,
      feedItems: [],
      totalSources: 0,
      feedTotal: 0,
      pageLimit: 20,
      sourceType: activityPubSourceTypes.BlueskyOfficial,
      sourceValue: 'bsky.app',
      sourceDisplayName: '@bsky.app via Bridgy Fed',
      loadingSources: false,
      loadingFeed: false,
      actionLoading: false,
      errorMessage: null,
      successMessage: null
    };
  }
}

function getSourceTitle(source) {
  const actor = source && source.remoteActor || {};
  if (source && source.displayName) {
    return source.displayName;
  }
  if (actor.preferredUsername && actor.domain) {
    return `@${actor.preferredUsername}@${actor.domain}`;
  }
  return source && (source.sourceResource || source.sourceActorUrl) || 'ActivityPub source';
}

function getSourceMeta(source) {
  if (!source) {
    return '';
  }
  const actor = source.remoteActor || {};
  const parts = [
    source.bridgeProvider,
    actor.domain,
    source.sourceResource
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : source.sourceActorUrl || '';
}

function getAttachmentMeta(attachment) {
  const parts = [
    attachment && attachment.mediaCategory,
    attachment && attachment.mediaType,
    attachment && attachment.embedPolicy && attachment.embedPolicy.mode,
    attachment && attachment.width && attachment.height ? `${attachment.width}x${attachment.height}` : null
  ].filter(Boolean);
  return parts.join(' · ');
}

function readNumber(value) {
  const result = Number(value || 0);
  return Number.isFinite(result) ? result : 0;
}

function formatUtcDateTime(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return [
    `${date.getUTCFullYear()}-${padDatePart(date.getUTCMonth() + 1)}-${padDatePart(date.getUTCDate())}`,
    `${padDatePart(date.getUTCHours())}:${padDatePart(date.getUTCMinutes())} UTC`
  ].join(' ');
}

function padDatePart(value) {
  return String(value).padStart(2, '0');
}

function getErrorMessage(error, fallback) {
  if (error && error.message) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }

  return fallback;
}
