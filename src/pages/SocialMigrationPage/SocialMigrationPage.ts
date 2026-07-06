import {
  defaultImportMediaPolicy,
  defaultImportRelationPolicy,
  getImportMediaPolicyInput,
  getImportRelationPolicyInput,
  getNonDefaultPolicyLabel
} from '../../libs/socialImportPolicy';

const sourceTypes = {
  Bluesky: 'bluesky',
  ActivityPub: 'activitypub'
};

const activityPubInputTypes = {
  Handle: 'handle',
  ActorUrl: 'actor-url',
  Resource: 'resource',
  BlueskyBridge: 'bluesky-bridge'
};

export default {
  template: require('./SocialMigrationPage.template'),
  async created() {
    await this.loadBlueskyAccounts();
  },
  methods: {
    async loadBlueskyAccounts() {
      try {
        const page = await this.$geesome.socNetDbAccountList({socNet: 'bluesky'});
        this.blueskyAccounts = page && Array.isArray(page.list) ? page.list : [];
        if (!this.selectedBlueskyAccountId && this.blueskyAccounts.length) {
          this.selectedBlueskyAccountId = this.blueskyAccounts[0].id;
        }
      } catch (e) {
        this.errorMessage = getErrorMessage(e, 'Could not load Bluesky accounts');
      }
    },
    async previewMigration() {
      this.loading = true;
      this.errorMessage = null;
      this.successMessage = null;

      try {
        const preview = await this.getPreviewRequest();
        this.preview = preview;
        this.successMessage = 'Migration preview loaded';
      } catch (e) {
        this.errorMessage = getErrorMessage(e, 'Could not preview migration');
      }

      this.loading = false;
    },
    async startMigration() {
      this.loading = true;
      this.errorMessage = null;
      this.successMessage = null;

      try {
        const result = await this.getImportRequest();
        this.importResult = result;
        this.reconciliationResult = null;
        this.successMessage = getImportSuccessMessage(result);
      } catch (e) {
        this.errorMessage = getErrorMessage(e, 'Could not start migration');
      }

      this.loading = false;
    },
    async reconcileRelations() {
      this.loading = true;
      this.errorMessage = null;
      this.successMessage = null;

      try {
        const result = await this.getReconcileRequest();
        this.reconciliationResult = result;
        this.successMessage = getReconcileSuccessMessage(result);
      } catch (e) {
        this.errorMessage = getErrorMessage(e, 'Could not reconcile migration relations');
      }

      this.loading = false;
    },
    resetPreviewState() {
      this.preview = null;
      this.importResult = null;
      this.reconciliationResult = null;
      this.errorMessage = null;
      this.successMessage = null;
    },
    resetReconcileScope() {
      this.reconcileSourceChannelId = '';
      this.reconcileCursorPublishedAt = '';
      this.reconcileCursorId = '';
    },
    getPreviewRequest() {
      if (this.sourceType === sourceTypes.ActivityPub) {
        return this.$geesome.userActivityPubMigrationPreview(this.getActivityPubInput(false));
      }
      return this.$geesome.userBlueskyMigrationPreview(this.getBlueskyInput(false));
    },
    getImportRequest() {
      if (this.sourceType === sourceTypes.ActivityPub) {
        return this.$geesome.userActivityPubMigrationImport(this.getActivityPubInput(true));
      }
      return this.$geesome.userBlueskyMigrationImport(this.getBlueskyInput(true));
    },
    getReconcileRequest() {
      const input = this.getReconcileInput();
      if (this.sourceType === sourceTypes.ActivityPub) {
        return this.$geesome.userActivityPubMigrationReconcileRelations(input);
      }
      return this.$geesome.userBlueskyMigrationReconcileRelations(input);
    },
    getReconcileInput() {
      const input: any = {
        groupName: this.targetGroupName.trim(),
        limit: parsePositiveInteger(this.reconcileLimit) || 20,
        dryRun: this.reconcileDryRun,
        allowCrossGroup: this.reconcileAllowCrossGroup,
        force: this.reconcileForce
      };
      if (this.reconcileSourceChannelId.trim()) {
        input.sourceChannelId = this.reconcileSourceChannelId.trim();
      }
      if (this.reconcileCursorPublishedAt.trim()) {
        input.cursorPublishedAt = this.reconcileCursorPublishedAt.trim();
      }
      const cursorId = parsePositiveInteger(this.reconcileCursorId);
      if (cursorId) {
        input.cursorId = cursorId;
      }
      return input;
    },
    getBlueskyInput(isImport) {
      const input: any = {
        actor: this.blueskyActor.trim(),
        claimed: true,
        accountData: this.getSelectedBlueskyAccountData(),
        filter: this.blueskyFilter,
        limit: parsePositiveInteger(this.limit) || 10
      };
      if (isImport) {
        input.groupName = this.targetGroupName.trim();
        input.async = this.importAsync;
        input.maxPages = parsePositiveInteger(this.maxPages) || 1;
        input.moderationPolicy = this.getModerationPolicy();
        input.mediaPolicy = getImportMediaPolicyInput(this.migrationMediaPolicy);
        input.relationPolicy = getImportRelationPolicyInput(this.migrationRelationPolicy);
      }
      return input;
    },
    getActivityPubInput(isImport) {
      const input: any = {
        claimed: true,
        limit: parsePositiveInteger(this.limit) || 10,
        maxPages: parsePositiveInteger(this.maxPages) || 1,
        includeFeatured: true,
        includeOutbox: true
      };
      if (this.activityPubInputType === activityPubInputTypes.BlueskyBridge) {
        input.preset = 'bluesky-official';
      } else if (this.activityPubInputType === activityPubInputTypes.ActorUrl) {
        input.actorUrl = this.activityPubSource.trim();
      } else if (this.activityPubInputType === activityPubInputTypes.Resource) {
        input.resource = this.activityPubSource.trim();
      } else {
        input.handle = this.activityPubSource.trim();
      }
      if (this.ownershipProofToken.trim()) {
        input.ownershipProofToken = this.ownershipProofToken.trim();
      }
      if (isImport) {
        input.createPosts = true;
        input.groupName = this.targetGroupName.trim();
        input.async = this.importAsync;
        input.moderationPolicy = this.getModerationPolicy();
        input.mediaPolicy = getImportMediaPolicyInput(this.migrationMediaPolicy);
        input.relationPolicy = getImportRelationPolicyInput(this.migrationRelationPolicy);
      }
      return input;
    },
    continueReconciliationFromNextCursor() {
      const cursor = this.reconciliationResult && this.reconciliationResult.nextCursor;
      if (!cursor) {
        return;
      }
      this.reconcileCursorPublishedAt = cursor.publishedAt || '';
      this.reconcileCursorId = cursor.id || '';
      return this.reconcileRelations();
    },
    getModerationPolicy() {
      return {
        mode: this.moderationMode,
        rules: this.moderationRules
      };
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
    getSelectedBlueskyAccountData() {
      const account = this.blueskyAccounts.find((item) => String(item.id) === String(this.selectedBlueskyAccountId));
      if (!account) {
        return {};
      }
      return {
        id: account.id,
        accountId: account.accountId,
        username: account.username
      };
    },
    getPreviewTitle(item) {
      const preview = item && (item.preview || item.post || item.record) || {};
      return preview.name || preview.title || preview.text || item && (item.objectId || item.uri || item.postUri) || 'Preview item';
    },
    getPreviewText(item) {
      const preview = item && (item.preview || item.post || item.record) || {};
      return preview.contentText || preview.text || preview.summaryText || preview.description || '';
    },
    getPreviewMeta(item) {
      const parts = [
        item && item.importKind,
        item && item.relationTypes && item.relationTypes.join(', '),
        item && (item.objectType || item.type),
        item && (item.actor || item.attributedTo || item.author)
      ].filter(Boolean);
      return parts.join(' · ');
    },
    getOwnershipText() {
      const ownership = this.preview && this.preview.ownership;
      if (!ownership) {
        return 'Ownership not checked yet';
      }
      if (ownership.verified) {
        return `Ownership verified${ownership.method ? ': ' + ownership.method : ''}`;
      }
      return ownership.reason || 'Ownership unverified';
    },
    getSummaryRows() {
      const summary = this.preview && this.preview.summary || {};
      return Object.keys(summary)
        .filter((key) => Number.isFinite(Number(summary[key])))
        .map((key) => ({key, value: summary[key]}));
    },
    getReconcileSummaryRows() {
      const result = this.reconciliationResult || {};
      return ['checked', 'updated', 'skipped', 'failed']
        .filter((key) => Number.isFinite(Number(result[key])))
        .map((key) => ({key, value: result[key]}));
    },
    getReconcileStatusRows() {
      const counts = getReconcileStatusCounts(this.reconciliationResult);
      return ['linked', 'missing', 'ambiguous', 'permission-blocked', 'already-linked', 'skipped']
        .filter((key) => counts[key])
        .map((key) => ({key, value: counts[key]}));
    },
    getReconcileRows() {
      return this.reconciliationResult && Array.isArray(this.reconciliationResult.rows)
        ? this.reconciliationResult.rows
        : [];
    },
    getReconcileErrors() {
      return this.reconciliationResult && Array.isArray(this.reconciliationResult.errors)
        ? this.reconciliationResult.errors
        : [];
    },
    getReconcileRowStatus(row) {
      return getReconcileRowStatus(row);
    },
    getReconcileRowMeta(row) {
      return getReconcileRowMeta(row);
    },
    getReconcileRowChangeText(row) {
      return getReconcileRowChangeText(row);
    },
    getReconcileReasonLabel(reason) {
      return getReconcileReasonLabel(reason);
    },
    getMigrationPolicyMeta() {
      const mediaPolicy = getImportMediaPolicyInput(this.migrationMediaPolicy);
      const relationPolicy = getImportRelationPolicyInput(this.migrationRelationPolicy);
      const parts = [
        getNonDefaultPolicyLabel('images', mediaPolicy.images, defaultImportMediaPolicy.images),
        getNonDefaultPolicyLabel('links', mediaPolicy.linkPreviews, defaultImportMediaPolicy.linkPreviews),
        getNonDefaultPolicyLabel('embeds', mediaPolicy.unsupportedEmbeds, defaultImportMediaPolicy.unsupportedEmbeds),
        getNonDefaultPolicyLabel('replies', relationPolicy.replies, defaultImportRelationPolicy.replies),
        getNonDefaultPolicyLabel('quotes', relationPolicy.quotes, defaultImportRelationPolicy.quotes),
        getNonDefaultPolicyLabel('reposts', relationPolicy.reposts, defaultImportRelationPolicy.reposts)
      ].filter(Boolean);
      return parts.length ? `Policy: ${parts.join(' · ')}` : 'Policy: preserve source context';
    },
    getRuleLabel(rule) {
      return getRuleLabel(rule);
    }
  },
  watch: {
    sourceType() {
      this.resetPreviewState();
      this.resetReconcileScope();
    },
    activityPubInputType() {
      if (this.activityPubInputType === activityPubInputTypes.BlueskyBridge) {
        this.activityPubSource = 'bsky.app';
      }
      this.resetPreviewState();
      this.resetReconcileScope();
    },
    blueskyActor: 'resetPreviewState',
    selectedBlueskyAccountId: 'resetPreviewState',
    blueskyFilter: 'resetPreviewState',
    activityPubSource: 'resetPreviewState',
    limit: 'resetPreviewState',
    maxPages: 'resetPreviewState',
    migrationMediaPolicy: {
      deep: true,
      handler: 'resetPreviewState'
    },
    migrationRelationPolicy: {
      deep: true,
      handler: 'resetPreviewState'
    }
  },
  computed: {
    isActivityPub() {
      return this.sourceType === sourceTypes.ActivityPub;
    },
    previewItems() {
      if (!this.preview) {
        return [];
      }
      if (Array.isArray(this.preview.list)) {
        return this.preview.list;
      }
      if (Array.isArray(this.preview.projectedPosts)) {
        return this.preview.projectedPosts;
      }
      return [];
    },
    previewDisabled() {
      if (this.loading) {
        return true;
      }
      if (this.isActivityPub && this.activityPubInputType !== activityPubInputTypes.BlueskyBridge) {
        return !this.activityPubSource.trim();
      }
      if (!this.isActivityPub) {
        return !this.blueskyActor.trim() || !this.selectedBlueskyAccountId;
      }
      return false;
    },
    startDisabled() {
      if (this.loading || !this.preview || !this.targetGroupName.trim()) {
        return true;
      }
      if (this.isActivityPub) {
        const ownership = this.preview.ownership || {};
        return !ownership.verified && !this.ownershipProofToken.trim();
      }
      return !this.selectedBlueskyAccountId;
    },
    reconcileDisabled() {
      return this.loading || !this.targetGroupName.trim();
    },
    hasPreviewItems() {
      return this.previewItems.length > 0;
    }
  },
  data() {
    return {
      sourceType: sourceTypes.Bluesky,
      blueskyActor: 'bsky.app',
      blueskyFilter: 'posts_with_replies',
      blueskyAccounts: [],
      selectedBlueskyAccountId: null,
      activityPubInputType: activityPubInputTypes.Handle,
      activityPubSource: 'alice@example.com',
      ownershipProofToken: '',
      targetGroupName: 'migrated-social-page',
      moderationMode: 'autoImport',
      moderationRules: [],
      newRule: {
        type: 'keyword',
        field: 'text',
        action: 'block',
        value: ''
      },
      migrationMediaPolicy: getImportMediaPolicyInput(),
      migrationRelationPolicy: getImportRelationPolicyInput(),
      limit: 10,
      maxPages: 2,
      importAsync: true,
      reconcileDryRun: true,
      reconcileAllowCrossGroup: true,
      reconcileForce: false,
      reconcileSourceChannelId: '',
      reconcileCursorPublishedAt: '',
      reconcileCursorId: '',
      reconcileLimit: 20,
      preview: null,
      importResult: null,
      reconciliationResult: null,
      loading: false,
      errorMessage: null,
      successMessage: null
    };
  }
};

function getImportSuccessMessage(result) {
  if (result && result.module && result.id) {
    return `Queued ${result.module} #${result.id}`;
  }
  const imported = readNumber(result && (result.imported || result.created || result.projectedPostsCount || result.cached));
  return `Migration started for ${imported} items`;
}

function getReconcileSuccessMessage(result) {
  const updated = readNumber(result && result.updated);
  const checked = readNumber(result && result.checked);
  if (result && result.dryRun) {
    return `Relation dry run checked ${checked} posts`;
  }
  return `Reconciled ${updated} post relations`;
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

function getRuleLabel(rule) {
  const parts = [
    rule && rule.action || 'block',
    rule && rule.type || 'keyword',
    rule && rule.field || 'text',
    rule && rule.value
  ].filter(Boolean);
  return parts.join(' · ');
}

function getReconcileStatusCounts(result) {
  const counts: any = {
    linked: 0,
    missing: 0,
    ambiguous: 0,
    'permission-blocked': 0,
    'already-linked': 0,
    skipped: 0
  };
  const rows = result && Array.isArray(result.rows) ? result.rows : [];
  rows.forEach((row) => {
    counts[getReconcileRowStatus(row)] += 1;
  });
  return counts;
}

function getReconcileRowStatus(row) {
  if (row && row.changes && Object.keys(row.changes).length) {
    return 'linked';
  }
  const reason = String(row && row.reason || '').toLowerCase();
  if (reason.indexOf('ambiguous') !== -1) {
    return 'ambiguous';
  }
  if (reason.indexOf('not_permitted') !== -1 || reason.indexOf('permission') !== -1) {
    return 'permission-blocked';
  }
  if (reason.indexOf('already_set') !== -1 || reason.indexOf('already_linked') !== -1) {
    return 'already-linked';
  }
  if (reason.indexOf('missing') !== -1 || reason.indexOf('not_found') !== -1) {
    return 'missing';
  }
  return 'skipped';
}

function getReconcileRowMeta(row) {
  const parts = [
    row && row.postId ? `post #${row.postId}` : null,
    row && row.sourcePostId,
    row && row.replyToId ? `reply ${row.replyToId}` : null,
    row && row.repostOfId ? `quote ${row.repostOfId}` : null
  ].filter(Boolean);
  return parts.join(' · ');
}

function getReconcileRowChangeText(row) {
  const changes = row && row.changes || {};
  const parts = [
    changes.replyToId ? `reply -> ${changes.replyToId}` : null,
    changes.repostOfId ? `quote -> ${changes.repostOfId}` : null
  ].filter(Boolean);
  if (parts.length) {
    return parts.join(' · ');
  }
  return getReconcileReasonLabel(row && row.reason);
}

function getReconcileReasonLabel(reason) {
  return String(reason || 'no relation change')
    .replace(/^(bluesky|activitypub)_migration_/, '')
    .replace(/_/g, ' ');
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
