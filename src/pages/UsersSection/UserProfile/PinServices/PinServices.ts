/*
 * Copyright ©️ 2018-2020 Galt•Project Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka)
 *
 * Copyright ©️ 2018-2020 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) by
 * [Basic Agreement](ipfs/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS)).
 */

const clone = require('lodash/clone');

const emptyAccount = () => ({
  name: 'pinata',
  service: 'pinata',
  endpoint: '',
  apiKey: '',
  secretApiKey: '',
  isEncrypted: true
});

function toAccountPayload(form) {
  const payload: any = {
    name: form.name,
    service: form.service,
    apiKey: form.apiKey,
    isEncrypted: !!form.isEncrypted
  };
  if (form.endpoint) {
    payload.endpoint = form.endpoint;
  }
  if (form.secretApiKey) {
    payload.secretApiKey = form.secretApiKey;
  }
  return payload;
}

function getAccountName(account) {
  return account ? account.name : '';
}

export default {
  template: require('./PinServices.template'),
  components: {},
  props: [],
  async created() {
    this.getPinAccounts();
  },
  methods: {
    async getPinAccounts() {
      this.loading = true;
      try {
        const response = await this.$geesome.getUserPinAccounts();
        this.pinAccounts = response.list || [];
        if (!this.pinAccountName && this.pinAccounts.length) {
          this.pinAccountName = getAccountName(this.pinAccounts[0]);
        }
      } finally {
        this.loading = false;
      }
    },
    addPinAccount() {
      this.form = emptyAccount();
      this.isFormVisible = true;
    },
    editPinAccount(account) {
      this.form = {
        ...clone(account),
        secretApiKey: ''
      };
      this.isFormVisible = true;
    },
    cancelPinAccount() {
      this.form = emptyAccount();
      this.isFormVisible = false;
    },
    async savePinAccount() {
      this.saving = true;
      try {
        const accountData = toAccountPayload(this.form);
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
      return this.saving || !this.form.name || !this.form.service || !this.form.apiKey || (!this.form.id && !this.form.secretApiKey);
    },
    isPinDisabled() {
      return this.pinning || !this.pinAccountName || !this.pinStorageId;
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
      form: emptyAccount(),
      pinAccountName: '',
      pinStorageId: '',
      uploadedContent: null,
      lastPinResult: null
    };
  }
}
