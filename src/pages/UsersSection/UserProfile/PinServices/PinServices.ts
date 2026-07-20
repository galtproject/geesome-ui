/*
 * Copyright ©️ 2018-2020 Galt•Project Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka)
 *
 * Copyright ©️ 2018-2020 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) by
 * [Basic Agreement](ipfs/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS)).
 */

const clone = require('lodash/clone');

export default {
  template: require('./PinServices.template'),
  components: {},
  props: ['groupId'],
  async created() {
    this.getPinAccounts();
  },
  methods: {
    async getPinAccounts() {
      this.loading = true;
      try {
        const response = this.isGroupMode
          ? await this.$geesome.getGroupPinAccounts(this.groupId)
          : await this.$geesome.getUserPinAccounts();
        this.pinAccounts = (response.list || []).map(account => normalizeAccount(account, this.isGroupMode));
        if (!this.pinAccountName && this.pinAccounts.length) {
          this.pinAccountName = getAccountName(this.pinAccounts[0]);
        }
        this.loadPinAccountHealths(this.pinAccounts);
      } finally {
        this.loading = false;
      }
    },
    async loadPinAccountHealths(accounts) {
      await runWithConcurrency(accounts, 3, account => this.loadPinAccountHealth(account));
    },
    async loadPinAccountHealth(account) {
      this.$set(this.healthLoadingById, account.id, true);
      this.$delete(this.healthErrorsById, account.id);
      try {
        const health = await this.$geesome.getPinAccountHealth(account.id, {historyLimit: 10});
        this.$set(this.healthById, account.id, health);
      } catch (e) {
        this.$set(this.healthErrorsById, account.id, getErrorMessage(e, 'Status unavailable'));
      } finally {
        this.$set(this.healthLoadingById, account.id, false);
      }
    },
    async testPinAccountCredentials(account) {
      this.credentialTestingId = account.id;
      this.$delete(this.credentialResultsById, account.id);
      try {
        const result = await this.$geesome.testPinAccountCredentials(account.id);
        this.$set(this.credentialResultsById, account.id, result);
        this.$notify({
          type: 'success',
          title: 'Pin service credentials verified'
        });
      } catch (e) {
        this.$set(this.credentialResultsById, account.id, {
          ok: false,
          message: getErrorMessage(e, 'Credential test failed')
        });
      } finally {
        this.credentialTestingId = null;
      }
    },
    async reconcilePinAccount(account, options = {limit: 20}) {
      this.reconcilingId = account.id;
      try {
        const result = await this.$geesome.reconcilePinAccount(account.id, options);
        this.$set(this.reconcileResultsById, account.id, result);
        this.$notify({
          type: 'success',
          title: getQueuedChecksLabel(result)
        });
        await this.loadPinAccountHealth(account);
      } catch (e) {
        this.$notify({
          type: 'error',
          title: getErrorMessage(e, 'Reconciliation failed')
        });
      } finally {
        this.reconcilingId = null;
      }
    },
    getAccountHealth(account) {
      return this.healthById[account.id] || null;
    },
    getAccountHealthState(account) {
      const health = this.getAccountHealth(account);
      if (this.healthErrorsById[account.id]) {
        return {label: 'Unavailable', key: 'unavailable'};
      }
      if (!health) {
        return {label: this.healthLoadingById[account.id] ? 'Checking' : 'Not checked', key: 'checking'};
      }
      const failures = getFailureCount(health);
      if (failures > 0) {
        return {label: 'Needs attention', key: 'failed'};
      }
      if (Number(health.dueReconciliationCount || 0) > 0) {
        return {label: 'Stale', key: 'stale'};
      }
      if (getStatusCount(health, 'requested') > 0
        || getStatusCount(health, 'accepted') > 0
        || Number(health.activeClaimCount || 0) > 0) {
        return {label: 'Checking', key: 'checking'};
      }
      if (!Number(health.totalCount || 0)) {
        return {label: 'No pin history', key: 'empty'};
      }
      if (getStatusCount(health, 'confirmed') === Number(health.totalCount || 0)) {
        return {label: 'Healthy', key: 'healthy'};
      }
      return {label: 'Partially confirmed', key: 'checking'};
    },
    getAccountHealthSummary(account) {
      const health = this.getAccountHealth(account);
      if (!health) {
        return this.healthErrorsById[account.id] || 'Loading pin ledger status';
      }
      return `${getStatusCount(health, 'confirmed')} confirmed · ${getStatusCount(health, 'accepted')} provider accepted · ${getFailureCount(health)} failed or missing`;
    },
    getStatusCount(health, status) {
      return getStatusCount(health, status);
    },
    getFailureCount(health) {
      return getFailureCount(health);
    },
    getQueuedChecksLabel(result) {
      return getQueuedChecksLabel(result);
    },
    getPinEntryStatusLabel(status) {
      return getPinEntryStatusLabel(status);
    },
    getPinEntryStatusKey(status) {
      return getPinEntryStatusKey(status);
    },
    canRetryPinEntry(status) {
      return ['missing', 'retryable_failure', 'terminal_failure'].includes(status);
    },
    formatPinDate(value) {
      return formatPinDate(value);
    },
    addPinAccount() {
      this.form = emptyAccount(this.isGroupMode);
      this.isFormVisible = true;
    },
    editPinAccount(account) {
      this.form = {
        ...normalizeAccount(clone(account), this.isGroupMode),
        secretApiKey: ''
      };
      this.isFormVisible = true;
    },
    addAutoPinMetadataRow() {
      this.form.autoPinMetadataRows.push({key: '', value: ''});
    },
    removeAutoPinMetadataRow(index) {
      this.form.autoPinMetadataRows.splice(index, 1);
    },
    cancelPinAccount() {
      this.form = emptyAccount(this.isGroupMode);
      this.isFormVisible = false;
    },
    async savePinAccount() {
      this.saving = true;
      try {
        const accountData = toAccountPayload(this.form, this.isGroupMode ? this.groupId : null);
        if (this.form.id) {
          await this.$geesome.updatePinAccount(this.form.id, accountData);
        } else {
          await this.$geesome.createPinAccount(accountData);
        }

        this.$notify({
          type: 'success',
          title: 'Pin service saved'
        });
        this.cancelPinAccount();
        await this.getPinAccounts();
      } catch (e) {
        this.$notify({
          type: 'error',
          title: e.message || e.error || 'Pin service save failed'
        });
      }
      this.saving = false;
    },
    async deletePinAccount(account) {
      if (!confirm(`Delete pin service "${account.name}"?`)) {
        return;
      }
      this.deletingId = account.id;
      try {
        await this.$geesome.deletePinAccount(account.id);
        this.$notify({
          type: 'success',
          title: 'Pin service deleted'
        });
        if (this.pinAccountName === account.name) {
          this.pinAccountName = '';
        }
        await this.getPinAccounts();
      } catch (e) {
        this.$notify({
          type: 'error',
          title: e.message || e.error || 'Pin service delete failed'
        });
      }
      this.deletingId = null;
    },
    handleUploaded(uploaded) {
      this.pinStorageId = uploaded.storageId || '';
      this.uploadedContent = uploaded;
      if (this.pinStorageId && this.pinAccounts.length && !this.pinAccountName) {
        this.pinAccountName = getAccountName(this.pinAccounts[0]);
      }
    },
    async pinUploadedContent() {
      if (this.isPinDisabled) {
        return;
      }
      this.pinning = true;
      this.lastPinResult = null;
      try {
        const response = await this.$geesome.pinContentByUserAccount(this.pinAccountName, this.pinStorageId, {
          source: 'geesome-ui',
          contentDbId: this.uploadedContent ? this.uploadedContent.id : undefined
        });
        this.lastPinResult = response;
        this.$notify({
          type: 'success',
          title: 'Content pinned'
        });
      } catch (e) {
        this.$notify({
          type: 'error',
          title: e.message || e.error || 'Pin request failed'
        });
      }
      this.pinning = false;
    }
  },
  watch: {},
  computed: {
    isSaveDisabled() {
      return this.saving
        || !this.form.name
        || !this.form.service
        || !this.form.apiKey
        || (!this.form.id && !this.form.secretApiKey)
        || this.hasInvalidAutoPinTargets
        || this.hasInvalidAutoPinMetadata;
    },
    hasInvalidAutoPinTargets() {
      return this.isGroupMode
        && this.form.autoPinEnabled
        && !this.form.autoPinPostManifest
        && !this.form.autoPinContents;
    },
    hasInvalidAutoPinMetadata() {
      if (!this.form.autoPinEnabled) {
        return false;
      }
      const keys = this.form.autoPinMetadataRows.map(row => String(row.key || '').trim());
      return keys.some(key => !key) || new Set(keys).size !== keys.length;
    },
    isPinDisabled() {
      return this.pinning || !this.pinAccountName || !this.pinStorageId;
    },
    isGroupMode() {
      return this.groupId !== undefined && this.groupId !== null && this.groupId !== '';
    },
    sectionTitle() {
      return this.isGroupMode ? 'Group pin services' : 'Pin services';
    },
    automaticPinLabel() {
      return this.isGroupMode ? 'Automatically pin published group posts' : 'Automatically pin new uploads';
    }
  },
  data() {
    return {
      loading: false,
      saving: false,
      pinning: false,
      deletingId: null,
      credentialTestingId: null,
      reconcilingId: null,
      isFormVisible: false,
      pinAccounts: [],
      healthById: {},
      healthLoadingById: {},
      healthErrorsById: {},
      credentialResultsById: {},
      reconcileResultsById: {},
      form: emptyAccount(false),
      pinAccountName: '',
      pinStorageId: '',
      uploadedContent: null,
      lastPinResult: null
    };
  }
}

function emptyAccount(isGroupMode) {
  return {
    name: 'pinata',
    service: 'pinata',
    endpoint: '',
    apiKey: '',
    secretApiKey: '',
    isEncrypted: true,
    autoPinEnabled: false,
    autoPinAttempts: 3,
    autoPinMetadataRows: [],
    autoPinPostManifest: !!isGroupMode,
    autoPinContents: !!isGroupMode
  };
}

function toAccountPayload(form, groupId) {
  const accountOptions = getAccountOptions(form);
  const autoPinOptions = accountOptions.autoPin || {};
  const payload: any = {
    name: form.name,
    service: form.service,
    apiKey: form.apiKey,
    isEncrypted: !!form.isEncrypted
  };
  if (groupId !== null) {
    payload.groupId = groupId;
  }
  if (form.endpoint) {
    payload.endpoint = form.endpoint;
  }
  if (form.secretApiKey) {
    payload.secretApiKey = form.secretApiKey;
  }
  const autoPin = {
    ...autoPinOptions,
    enabled: !!form.autoPinEnabled,
    attempts: normalizeAutoPinAttempts(form.autoPinAttempts),
    metadata: getAutoPinMetadata(form.autoPinMetadataRows)
  };
  if (groupId !== null) {
    autoPin.scope = 'group-post';
    autoPin.targets = getGroupAutoPinTargets(form);
  }
  payload.options = {
    ...accountOptions,
    autoPin
  };
  return payload;
}

function getAccountName(account) {
  return account ? account.name : '';
}

function normalizeAccount(account, isGroupMode) {
  const options = getAccountOptions(account);
  const autoPin = options.autoPin || {};
  const targets = Array.isArray(autoPin.targets) ? autoPin.targets : [];
  return {
    ...account,
    options,
    autoPinEnabled: autoPin.enabled === true,
    autoPinAttempts: normalizeAutoPinAttempts(autoPin.attempts),
    autoPinPostManifest: isGroupMode && targets.includes('post-manifest'),
    autoPinContents: isGroupMode && targets.includes('contents'),
    autoPinTargetsLabel: getGroupAutoPinTargetsLabel(targets),
    autoPinMetadataRows: Object.keys(autoPin.metadata || {}).map(key => ({
      key,
      value: String(autoPin.metadata[key])
    }))
  };
}

function getGroupAutoPinTargets(form) {
  const targets = [];
  if (form.autoPinPostManifest) {
    targets.push('post-manifest');
  }
  if (form.autoPinContents) {
    targets.push('contents');
  }
  return targets;
}

function getGroupAutoPinTargetsLabel(targets) {
  const labels = [];
  if (targets.includes('post-manifest')) {
    labels.push('manifests');
  }
  if (targets.includes('contents')) {
    labels.push('content');
  }
  return labels.join(' + ');
}

function getAccountOptions(account) {
  if (!account || !account.options) {
    return {};
  }
  if (typeof account.options === 'object') {
    return account.options;
  }
  try {
    const options = JSON.parse(account.options);
    return options && typeof options === 'object' ? options : {};
  } catch (e) {
    return {};
  }
}

function normalizeAutoPinAttempts(value) {
  const attempts = Number.parseInt(value, 10);
  if (!Number.isFinite(attempts)) {
    return 3;
  }
  return Math.min(Math.max(attempts, 1), 10);
}

function getAutoPinMetadata(rows) {
  const metadata = {};
  (rows || []).forEach(row => {
    const key = String(row.key || '').trim();
    if (key) {
      metadata[key] = String(row.value || '');
    }
  });
  return metadata;
}

async function runWithConcurrency(items, concurrency, callback) {
  const queue = (items || []).slice();
  const workers = Array.from({length: Math.min(concurrency, queue.length)}, async () => {
    while (queue.length) {
      await callback(queue.shift());
    }
  });
  await Promise.all(workers);
}

function getStatusCount(health, status) {
  return Number(health && health.statusCounts && health.statusCounts[status] || 0);
}

function getFailureCount(health) {
  return getStatusCount(health, 'missing')
    + getStatusCount(health, 'retryableFailure')
    + getStatusCount(health, 'terminalFailure');
}

function getPinEntryStatusLabel(status) {
  const labels = {
    requested: 'Queued',
    accepted: 'Provider accepted',
    confirmed: 'Confirmed',
    pinned: 'Confirmed (legacy)',
    missing: 'Missing',
    retryable_failure: 'Retry scheduled',
    terminal_failure: 'Failed'
  };
  return labels[status] || status || 'Unknown';
}

function getPinEntryStatusKey(status) {
  if (status === 'confirmed' || status === 'pinned') {
    return 'healthy';
  }
  if (status === 'missing' || status === 'terminal_failure') {
    return 'failed';
  }
  if (status === 'retryable_failure') {
    return 'stale';
  }
  return 'checking';
}

function formatPinDate(value) {
  if (!value) {
    return 'Not yet';
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return 'Unknown';
  }
  return date.toLocaleString();
}

function getErrorMessage(error, fallback) {
  return error && (error.message || error.error) || fallback;
}

function getQueuedChecksLabel(result) {
  const queued = Number(result && result.queued || 0);
  if (!queued) {
    return 'Pin account is up to date';
  }
  return `${queued} pin ${queued === 1 ? 'check' : 'checks'} queued`;
}
