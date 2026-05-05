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
    }
  },
  watch: {},
  computed: {
    isSaveDisabled() {
      return this.saving || !this.form.name || !this.form.service || !this.form.apiKey || (!this.form.id && !this.form.secretApiKey);
    }
  },
  data() {
    return {
      loading: false,
      saving: false,
      isFormVisible: false,
      pinAccounts: [],
      form: emptyAccount()
    };
  }
}
