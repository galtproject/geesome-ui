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
      } finally {
        this.loading = false;
      }
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
      isFormVisible: false,
      pinAccounts: [],
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
