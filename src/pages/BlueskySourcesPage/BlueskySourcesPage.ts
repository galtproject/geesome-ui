/*
 * Copyright ©️ 2018-2020 Galt•Project Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka)
 *
 * Copyright ©️ 2018-2020 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) by
 * [Basic Agreement](ipfs/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS)).
 */

import {
  defaultImportMediaPolicy,
  defaultImportRelationPolicy,
  getImportMediaPolicyInput,
  getImportRelationPolicyInput,
  getNonDefaultPolicyLabel
} from '../../libs/socialImportPolicy';

const defaultBlueskyActor = 'bsky.app';
const defaultBlueskyFilter = 'posts_no_replies';

export default {
  template: require('./BlueskySourcesPage.template'),
  props: [],
  async created() {
    await this.refreshSources();
  },
  methods: {
    async refreshSources() {
      this.loadingSources = true;
      this.errorMessage = null;

      try {
        const page = await this.$geesome.adminGetBlueskySourceSubscriptions({
          limit: this.pageLimit,
          offset: 0
        });
        this.sources = page && Array.isArray(page.list) ? page.list : [];
        this.totalSources = page && page.total ? page.total : this.sources.length;
        await this.selectDefaultSource();
      } catch (e) {
        this.errorMessage = getErrorMessage(e, 'Could not load Bluesky sources');
      }

      this.loadingSources = false;
    },
    async subscribeSource() {
      this.actionLoading = true;
      this.errorMessage = null;
      this.successMessage = null;

      try {
        const source = await this.$geesome.adminSubscribeBlueskySource(this.getSourceInput());
        this.selectedSource = source;
        this.successMessage = `Subscribed ${this.getSourceTitle(source)}`;
        await this.refreshSources();
        await this.selectSourceById(source && source.id);
      } catch (e) {
        this.errorMessage = getErrorMessage(e, 'Could not subscribe to Bluesky source');
      }

      this.actionLoading = false;
    },
    async saveSelectedSourceSettings() {
      if (!this.selectedSource || !this.selectedSource.id) {
        return;
      }

      this.actionLoading = true;
      this.errorMessage = null;
      this.successMessage = null;

      try {
        const source = await this.$geesome.adminUpdateBlueskySourceSubscription(
          this.selectedSource.id,
          this.getSourceUpdateInput()
        );
        this.selectedSource = source || this.selectedSource;
        this.replaceSource(this.selectedSource);
        this.setSourceFormFromSelectedSource();
        this.successMessage = `Saved ${this.getSourceTitle(this.selectedSource)}`;
      } catch (e) {
        this.errorMessage = getErrorMessage(e, 'Could not save Bluesky source settings');
      }

      this.actionLoading = false;
    },
    async selectDefaultSource() {
      if (!this.sources.length) {
        this.selectedSource = null;
        this.feedItems = [];
        this.feedTotal = 0;
        this.reviewItems = [];
        this.reviewTotal = 0;
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
      this.setSourceFormFromSelectedSource();
      await this.refreshFeed();
      await this.refreshReviews();
    },
    async refreshFeed() {
      if (!this.selectedSource || !this.selectedSource.id || !this.selectedSource.dbChannelId) {
        this.feedItems = [];
        this.feedTotal = 0;
        return;
      }

      this.loadingFeed = true;
      this.errorMessage = null;

      try {
        const page = await this.$geesome.adminGetBlueskySourceFeed(this.selectedSource.id, {
          limit: this.pageLimit,
          offset: 0
        });
        this.selectedSource = page && page.source ? page.source : this.selectedSource;
        this.replaceSource(this.selectedSource);

        const posts = page && page.posts || {};
        this.feedItems = Array.isArray(posts.list) ? posts.list : [];
        this.feedTotal = posts && posts.total ? posts.total : this.feedItems.length;
      } catch (e) {
        this.errorMessage = getErrorMessage(e, 'Could not load Bluesky source feed');
      }

      this.loadingFeed = false;
    },
    async refreshReviews() {
      if (!this.selectedSource || !this.selectedSource.id) {
        this.reviewItems = [];
        this.reviewTotal = 0;
        return;
      }

      this.loadingReviews = true;
      this.errorMessage = null;

      try {
        const filters: any = {
          limit: this.pageLimit,
          offset: 0
        };
        if (this.reviewStateFilter) {
          filters.state = this.reviewStateFilter;
        }

        const page = await this.$geesome.adminGetBlueskySourceReviews(this.selectedSource.id, filters);
        this.selectedSource = page && page.source ? page.source : this.selectedSource;
        this.replaceSource(this.selectedSource);
        this.reviewItems = page && Array.isArray(page.list) ? page.list : [];
        this.reviewTotal = page && page.total ? page.total : this.reviewItems.length;
      } catch (e) {
        this.errorMessage = getErrorMessage(e, 'Could not load Bluesky source reviews');
      }

      this.loadingReviews = false;
    },
    async refreshSelectedSourceFromRemote() {
      if (!this.selectedSource || !this.selectedSource.id) {
        return;
      }

      this.actionLoading = true;
      this.errorMessage = null;
      this.successMessage = null;

      try {
        const result = await this.$geesome.adminRefreshBlueskySourceSubscription(
          this.selectedSource.id,
          this.getRefreshInput()
        );
        this.selectedSource = result && result.source ? result.source : this.selectedSource;
        this.replaceSource(this.selectedSource);
        this.successMessage = getRefreshSuccessMessage(result);
        await this.refreshFeed();
        await this.refreshReviews();
      } catch (e) {
        this.errorMessage = getErrorMessage(e, 'Could not refresh Bluesky source');
      }

      this.actionLoading = false;
    },
    async syncSelectedSource() {
      if (!this.selectedSource || !this.selectedSource.id || !this.selectedSource.dbChannelId) {
        return;
      }

      this.actionLoading = true;
      this.errorMessage = null;
      this.successMessage = null;

      try {
        const result = await this.$geesome.adminSyncBlueskySourcePosts(this.selectedSource.id, {
          limit: this.pageLimit
        });
        this.selectedSource = result && result.source ? result.source : this.selectedSource;
        this.replaceSource(this.selectedSource);
        this.successMessage = getSyncSuccessMessage(result);
        await this.refreshFeed();
        await this.refreshReviews();
      } catch (e) {
        this.errorMessage = getErrorMessage(e, 'Could not sync Bluesky source');
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
        this.selectedSource = await this.$geesome.adminUpdateBlueskySourceSubscription(this.selectedSource.id, {status});
        await this.refreshSources();
      } catch (e) {
        this.errorMessage = getErrorMessage(e, 'Could not update Bluesky source');
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
        await this.$geesome.adminRemoveBlueskySourceSubscription(this.selectedSource.id);
        this.selectedSource = null;
        this.feedItems = [];
        this.reviewItems = [];
        await this.refreshSources();
      } catch (e) {
        this.errorMessage = getErrorMessage(e, 'Could not remove Bluesky source');
      }

      this.actionLoading = false;
    },
    async importReview(review) {
      if (!this.selectedSource || !this.selectedSource.id || !review || !review.id) {
        return;
      }

      this.actionLoading = true;
      this.errorMessage = null;
      this.successMessage = null;

      try {
        const result = await this.$geesome.adminImportBlueskySourceReview(
          this.selectedSource.id,
          review.id,
          this.getSourcePolicyInput()
        );
        this.selectedSource = result && result.source ? result.source : this.selectedSource;
        this.replaceSource(this.selectedSource);
        this.successMessage = getReviewImportSuccessMessage(result);
        await this.refreshReviews();
        await this.refreshFeed();
      } catch (e) {
        this.errorMessage = getErrorMessage(e, 'Could not import Bluesky review');
      }

      this.actionLoading = false;
    },
    async setReviewState(review, state) {
      if (!this.selectedSource || !this.selectedSource.id || !review || !review.id) {
        return;
      }

      this.actionLoading = true;
      this.errorMessage = null;
      this.successMessage = null;

      try {
        const updatedReview = await this.$geesome.adminUpdateBlueskySourceReviewState(
          this.selectedSource.id,
          review.id,
          {state}
        );
        this.successMessage = `Marked ${this.getReviewTitle(updatedReview || review)} ${state}`;
        await this.refreshReviews();
      } catch (e) {
        this.errorMessage = getErrorMessage(e, 'Could not update Bluesky review');
      }

      this.actionLoading = false;
    },
    addModerationRule() {
      const value = this.newRule.value.trim();
      if (!value) {
        return;
      }

      this.moderationRules = this.moderationRules.concat([{
        name: value,
        type: this.newRule.type,
        field: this.newRule.field,
        action: this.newRule.action,
        value
      }]);
      this.newRule.value = '';
    },
    removeModerationRule(index) {
      this.moderationRules = this.moderationRules.filter((item, itemIndex) => itemIndex !== index);
    },
    replaceSource(source) {
      if (!source || !source.id) {
        return;
      }
      this.sources = this.sources.map(item => String(item.id) === String(source.id) ? source : item);
    },
    setSourceFormFromSelectedSource() {
      const source = this.selectedSource;
      if (!source) {
        return;
      }

      this.sourceActor = source.actor || this.sourceActor;
      this.sourceFilter = source.filter || defaultBlueskyFilter;
      this.sourceDisplayName = source.displayName || '';
      this.sourceGroupName = source.groupName || '';
      this.sourceImportLimit = source.importLimit || this.sourceImportLimit;
      this.moderationMode = source.moderationMode || this.moderationMode;
      this.moderationRules = Array.isArray(source.moderationRules) ? source.moderationRules : [];
      this.sourceMediaPolicy = getImportMediaPolicyInput(source.mediaPolicy);
      this.sourceRelationPolicy = getImportRelationPolicyInput(source.relationPolicy);
    },
    getSourceInput() {
      const input: any = {
        actor: this.sourceActor.trim(),
        ...this.getSourcePreferencesInput(false)
      };

      return input;
    },
    getSourceUpdateInput() {
      return this.getSourcePreferencesInput(true);
    },
    getSourcePreferencesInput(includeEmptyValues) {
      const input: any = {
        filter: this.sourceFilter,
        moderationMode: this.moderationMode,
        moderationRules: this.moderationRules,
        ...this.getSourcePolicyInput()
      };
      const displayName = this.sourceDisplayName.trim();
      const groupName = this.sourceGroupName.trim();
      const importLimit = parsePositiveInteger(this.sourceImportLimit);

      if (displayName) {
        input.displayName = displayName;
      } else if (includeEmptyValues) {
        input.displayName = '';
      }
      if (groupName) {
        input.groupName = groupName;
      } else if (includeEmptyValues) {
        input.groupName = '';
      }
      if (importLimit) {
        input.importLimit = importLimit;
      } else if (includeEmptyValues) {
        input.importLimit = null;
      }

      return input;
    },
    getSourcePolicyInput() {
      return {
        mediaPolicy: getImportMediaPolicyInput(this.sourceMediaPolicy),
        relationPolicy: getImportRelationPolicyInput(this.sourceRelationPolicy)
      };
    },
    getRefreshInput() {
      const input: any = this.getSourcePolicyInput();
      const importLimit = parsePositiveInteger(this.sourceImportLimit);

      if (this.sourceFilter) {
        input.filter = this.sourceFilter;
      }
      if (importLimit) {
        input.limit = importLimit;
      }
      if (this.moderationMode || this.moderationRules.length) {
        input.moderationPolicy = {
          mode: this.moderationMode,
          rules: this.moderationRules
        };
      }

      return input;
    },
    getSourceTitle(source) {
      return getSourceTitle(source);
    },
    getSourceMeta(source) {
      return getSourceMeta(source);
    },
    getSourcePolicyMeta(source) {
      return getSourcePolicyMeta(source);
    },
    getSourceInitials(source) {
      const title = this.getSourceTitle(source);
      return title.replace(/^@/, '').slice(0, 2).toUpperCase();
    },
    getSourceStatusClass(source) {
      return `activitypub-source-status status-${source && source.status || 'active'}`;
    },
    getSourceRefreshText(source) {
      return getSourceRefreshText(source);
    },
    getRuleLabel(rule) {
      return getRuleLabel(rule);
    },
    getFeedItemTitle(item) {
      return getFeedItemTitle(item);
    },
    getFeedItemText(item) {
      return getFeedItemText(item);
    },
    getFeedItemMeta(item) {
      return getFeedItemMeta(item, this.selectedSource);
    },
    getFeedItemUrl(item) {
      return getFeedItemUrl(item, this.selectedSource);
    },
    getPostStatusClass(item) {
      return `activitypub-source-status status-${item && item.status || 'published'}`;
    },
    getReviewTitle(review) {
      return getReviewTitle(review);
    },
    getReviewText(review) {
      return getReviewText(review);
    },
    getReviewMeta(review) {
      return getReviewMeta(review, this.selectedSource);
    },
    getReviewUrl(review) {
      return getReviewUrl(review, this.selectedSource);
    },
    getReviewDecisionLabel(review) {
      return getReviewDecisionLabel(review);
    },
    getReviewStateClass(review) {
      return `activitypub-feed-state review-${review && review.state || 'pending'}`;
    },
    isReviewImportable(review) {
      return isReviewImportable(review);
    },
    canRejectReview(review) {
      return canRejectReview(review);
    },
    canResetReview(review) {
      return canResetReview(review);
    }
  },
  computed: {
    hasSources() {
      return this.sources.length > 0;
    },
    hasFeedItems() {
      return this.feedItems.length > 0;
    },
    hasReviewItems() {
      return this.reviewItems.length > 0;
    },
    subscribeDisabled() {
      return this.actionLoading || this.loadingSources || !this.sourceActor.trim();
    },
    saveSettingsDisabled() {
      return this.actionLoading || !this.selectedSource || !this.selectedSource.id;
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
      reviewItems: [],
      totalSources: 0,
      feedTotal: 0,
      reviewTotal: 0,
      pageLimit: 20,
      reviewStateFilter: '',
      sourceActor: defaultBlueskyActor,
      sourceFilter: defaultBlueskyFilter,
      sourceDisplayName: '@bsky.app',
      sourceGroupName: 'bluesky-bsky-app',
      sourceImportLimit: 20,
      moderationMode: 'autoImport',
      moderationRules: [],
      sourceMediaPolicy: getImportMediaPolicyInput(),
      sourceRelationPolicy: getImportRelationPolicyInput(),
      newRule: {
        type: 'keyword',
        field: 'text',
        action: 'block',
        value: ''
      },
      loadingSources: false,
      loadingFeed: false,
      loadingReviews: false,
      actionLoading: false,
      errorMessage: null,
      successMessage: null
    };
  }
}

function getSourceTitle(source) {
  if (source && source.displayName) {
    return source.displayName;
  }
  return source && source.actor || 'Bluesky source';
}

function getSourceMeta(source) {
  if (!source) {
    return '';
  }
  const parts = [
    source.actor,
    source.filter,
    source.groupName,
    source.importLimit ? `limit ${source.importLimit}` : null,
    source.moderationMode
  ].filter(Boolean);
  return parts.join(' · ');
}

function getSourcePolicyMeta(source) {
  const mediaPolicy = getImportMediaPolicyInput(source && source.mediaPolicy);
  const relationPolicy = getImportRelationPolicyInput(source && source.relationPolicy);
  const parts = [
    getNonDefaultPolicyLabel('images', mediaPolicy.images, defaultImportMediaPolicy.images),
    getNonDefaultPolicyLabel('links', mediaPolicy.linkPreviews, defaultImportMediaPolicy.linkPreviews),
    getNonDefaultPolicyLabel('embeds', mediaPolicy.unsupportedEmbeds, defaultImportMediaPolicy.unsupportedEmbeds),
    getNonDefaultPolicyLabel('replies', relationPolicy.replies, defaultImportRelationPolicy.replies),
    getNonDefaultPolicyLabel('quotes', relationPolicy.quotes, defaultImportRelationPolicy.quotes),
    getNonDefaultPolicyLabel('reposts', relationPolicy.reposts, defaultImportRelationPolicy.reposts)
  ].filter(Boolean);
  return parts.length ? `Policy: ${parts.join(' · ')}` : 'Policy: preserve source context';
}

function getSourceRefreshText(source) {
  if (!source) {
    return '';
  }
  if (source.lastImportedAt) {
    return `Imported ${formatUtcDateTime(source.lastImportedAt)}`;
  }
  if (source.lastRefreshRequestedAt) {
    return `Refresh requested ${formatUtcDateTime(source.lastRefreshRequestedAt)}`;
  }
  return source.dbChannelId ? 'Ready to read imported posts' : 'Refresh to import posts';
}

function getRuleLabel(rule) {
  const parts = [
    rule && rule.action || 'block',
    rule && rule.type || 'keyword',
    rule && rule.field || 'text',
    rule && rule.value
  ].filter(Boolean);
  return parts.join(' · ');
}

function getFeedItemTitle(item) {
  return item && (item.title || item.name || getPostProperty(item, 'text') || item.sourcePostId || `Post #${item.id}`) || 'Imported post';
}

function getFeedItemText(item) {
  return item && (
    item.contentText ||
    item.description ||
    getPostProperty(item, 'text') ||
    item.sourcePostId ||
    'No text preview'
  ) || 'No text preview';
}

function getFeedItemMeta(item, source) {
  const parts = [
    source && source.actor,
    item && item.source,
    item && item.publishedAt ? formatUtcDateTime(item.publishedAt) : null,
    item && item.id ? `local #${item.id}` : null
  ].filter(Boolean);
  return parts.join(' · ');
}

function getFeedItemUrl(item, source) {
  const directUrl = getPostProperty(item, 'url') || getPostProperty(item, 'remoteUrl');
  if (directUrl) {
    return directUrl;
  }

  return getBlueskyPostUrl(source && source.actor, item && item.sourcePostId);
}

function getReviewTitle(review) {
  const preview = review && review.preview || {};
  if (preview.name || preview.title) {
    return preview.name || preview.title;
  }
  if (preview.text || preview.contentText) {
    return preview.text || preview.contentText;
  }
  if (review && review.uri) {
    return review.uri;
  }
  if (review && review.id) {
    return `Review #${review.id}`;
  }
  return 'Review item';
}

function getReviewText(review) {
  const preview = review && review.preview || {};
  return preview.contentText || preview.text || preview.summaryText || preview.description || 'No text preview';
}

function getReviewMeta(review, source) {
  const parts = [
    review && review.actor || source && source.actor,
    review && review.moderationAction,
    review && review.publishedAt ? formatUtcDateTime(review.publishedAt) : null,
    review && review.id ? `review #${review.id}` : null
  ].filter(Boolean);
  return parts.join(' · ');
}

function getReviewUrl(review, source) {
  const preview = review && review.preview || {};
  if (preview.url) {
    return preview.url;
  }
  return getBlueskyPostUrl(review && review.actor || source && source.actor, review && review.uri);
}

function getReviewDecisionLabel(review) {
  const decision = review && review.moderationDecision || {};
  const parts = [
    review && review.moderationAction,
    decision && (decision.reason || decision.ruleName || decision.message)
  ].filter(Boolean);
  return parts.join(' · ');
}

function isReviewImportable(review) {
  return review && (review.state === 'pending' || review.state === 'quarantined');
}

function canRejectReview(review) {
  return review && review.state !== 'imported' && review.state !== 'rejected';
}

function canResetReview(review) {
  return review && review.state !== 'pending' && review.state !== 'imported';
}

function getPostProperty(item, key) {
  const properties = item && item.propertiesJson || {};
  const bluesky = properties && properties.bluesky || {};
  return bluesky && bluesky[key] || properties && properties[key] || null;
}

function getBlueskyPostUrl(actor, sourcePostId) {
  if (!sourcePostId) {
    return '';
  }
  if (/^https?:\/\//.test(sourcePostId)) {
    return sourcePostId;
  }
  const match = String(sourcePostId).match(/^at:\/\/([^/]+)\/app\.bsky\.feed\.post\/([^/]+)$/);
  if (!match) {
    return '';
  }
  return `https://bsky.app/profile/${encodeURIComponent(actor || match[1])}/post/${encodeURIComponent(match[2])}`;
}

function getRefreshSuccessMessage(result) {
  const fetched = readNumber(result && result.fetched);
  const imported = readNumber(result && result.imported);
  return `Fetched ${fetched}, imported ${imported}`;
}

function getSyncSuccessMessage(result) {
  const checked = readNumber(result && result.checked);
  const updated = readNumber(result && result.updated);
  const deleted = readNumber(result && result.deleted);
  return `Checked ${checked}, updated ${updated}, deleted ${deleted}`;
}

function getReviewImportSuccessMessage(result) {
  return `Imported ${readNumber(result && result.imported)} Bluesky review`;
}

function parsePositiveInteger(value) {
  const result = Number(value);
  if (!Number.isFinite(result) || result <= 0) {
    return null;
  }
  return Math.floor(result);
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
