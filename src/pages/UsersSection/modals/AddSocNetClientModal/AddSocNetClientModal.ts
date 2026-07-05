/*
 * Copyright ©️ 2018-2020 Galt•Project Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka)
 *
 * Copyright ©️ 2018-2020 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) by
 * [Basic Agreement](ipfs/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS)).
 */

import QRCode from 'qrcode';
import {ModalItem} from 'geesome-vue-components/src/modals/AsyncModal';

const includes = require('lodash/includes');
const clone = require('lodash/clone');

export default {
  template: require('./AddSocNetClientModal.template'),
  props: ['account', 'initialSocNet'],
  components: {
    ModalItem
  },
  async created() {
    if (this.account) {
      this.socNet = this.account.socNet;
      if (this.socNet === 'bluesky') {
        this.inputs = getBlueskyInputs(this.account);
        return;
      }
      const account = clone(this.account);
      await this.$geesome.setKeysToSocNetAccountData(this.socNet, account);
      this.inputs = account;
      ['isEncrypted'].forEach(boolField => {
        this.$set(this.inputs, boolField, !!this.account[boolField]);
      })
    }
    if (this.initialSocNet === 'bluesky') {
      this.socNet = 'bluesky';
      this.inputs = getBlueskyInputs();
    }
  },
  methods: {
    async login() {
      if (this.socNet === 'bluesky') {
        await this.loginBluesky();
        return;
      }

      this.loading = true;
      try {
        const result = await this.$geesome.socNetLogin(this.socNet, this.inputs);
        if (result.error) {
          throw new Error(result.error);
        }
        if (result.response.phoneCodeHash) {
          this.inputs.phoneCodeHash = result.response.phoneCodeHash;
          this.phoneCodeRequired = true;
          this.$set(this.inputs, 'stage', 2);
        } else if (result.response.user || result.response.id) {
          this.close();
          this.$notify({
            type: 'success',
            title: "Success"
          });
        }
      } catch (e) {
        this.$notify({
          type: 'error',
          title: e.message
        });
        if (includes(e.message, 'SESSION_PASSWORD_NEEDED')) {
          this.passwordRequired = true;
          this.$set(this.inputs, 'stage', 3);
        }
      }
      this.loading = false;
    },
    async loginBluesky() {
      this.loading = true;
      try {
        const result = await this.$geesome.userBlueskyLogin(this.getBlueskyLoginInput());
        if (result.error) {
          throw new Error(result.error);
        }
        this.close();
        this.$notify({
          type: 'success',
          title: 'Bluesky account connected'
        });
      } catch (e) {
        this.$notify({
          type: 'error',
          title: e.message
        });
      }
      this.loading = false;
    },
    async verifyBluesky() {
      this.loading = true;
      try {
        const result = await this.$geesome.userBlueskyVerifyAccount(this.getBlueskyVerifyInput());
        if (result.error) {
          throw new Error(result.error);
        }
        this.$notify({
          type: 'success',
          title: 'Bluesky account verified'
        });
      } catch (e) {
        this.$notify({
          type: 'error',
          title: e.message
        });
      }
      this.loading = false;
    },
    getBlueskyLoginInput() {
      const input: any = {
        identifier: this.inputs.identifier,
        appPassword: this.inputs.appPassword,
        isEncrypted: !!this.inputs.isEncrypted
      };
      if (this.account && this.account.id) {
        input.accountData = {id: this.account.id};
      }
      if (input.isEncrypted && input.appPassword && this.$geesome.getEncryptedSocNetApiKey) {
        input.encryptedApiKey = this.$geesome.getEncryptedSocNetApiKey(input.appPassword);
      }
      return input;
    },
    getBlueskyVerifyInput() {
      const accountData: any = {};
      if (this.account && this.account.id) {
        accountData.id = this.account.id;
      }
      if (this.inputs.identifier) {
        accountData.username = this.inputs.identifier;
      }
      const input: any = {accountData};
      if (this.inputs.appPassword) {
        input.appPassword = this.inputs.appPassword;
      }
      return input;
    },
    async getQrCode() {
      this.loading = true;
      const result = await this.$geesome.socNetLogin(this.socNet, this.inputs);
      this.$refs.qrimage.src = await QRCode.toDataURL(result.response.url);
      this.$set(this.inputs, 'stage', 2);
      this.$set(this.inputs, 'id', result.account.id);
      this.loading = false;
    },
    async close() {
      this.$root.$asyncModal.close('add-soc-net-client-modal');
    }
  },
  watch: {
    'inputs.byQrCode'() {
      if (this.inputs.byQrCode) {
        this.$set(this.inputs, 'stage', 1);
        this.getQrCode();
      }
    },
    'socNet'() {
      if (this.socNet === 'telegram') {
        this.inputs = getDefaultSocNetInputs();
      } else if (this.socNet === 'bluesky') {
        this.inputs = getBlueskyInputs(this.account);
      } else {
        this.inputs = {
          ...getDefaultSocNetInputs(),
          stage: 0
        };
      }
    }
  },
  computed: {
    loginDisabled() {
      if (this.inputs.byQrCode) {
        return this.passwordRequired ? !this.inputs.password : false;
      }
      if (this.socNet === 'telegram') {
        return !this.inputs.phoneNumber || !this.inputs.apiId || !this.inputs.apiKey || (this.phoneCodeRequired && !this.inputs.phoneCode) || (this.passwordRequired && !this.inputs.password);
      }
      if (this.socNet === 'twitter') {
        return !this.inputs.apiId || !this.inputs.apiKey || !this.inputs.accessToken || !this.inputs.sessionKey;
      }
      if (this.socNet === 'bluesky') {
        return !this.inputs.identifier || !this.inputs.appPassword;
      }
      return false;
    },
    verifyDisabled() {
      if (this.socNet !== 'bluesky' || !this.account || this.loading) {
        return true;
      }
      return !!this.account.isEncrypted && !this.inputs.appPassword;
    },
    loginButtonText() {
      if (this.socNet === 'bluesky') {
        return this.account ? 'Update Bluesky' : 'Connect Bluesky';
      }
      return 'Login';
    },
    encryptionLabel() {
      if (this.socNet === 'bluesky') {
        return 'Encrypt app password with API token';
      }
      return 'Encrypt session key with API token';
    }
  },
  data: function () {
    return {
      loading: false,
      socNet: 'telegram',
      inputs: getDefaultSocNetInputs(),
      phoneCodeRequired: false,
      passwordRequired: false
    }
  }
}

function getDefaultSocNetInputs() {
  return {
    apiId: '',
    apiKey: '',
    accessToken: '',
    sessionKey: '',
    phoneNumber: '',
    phoneCodeHash: '',
    phoneCode: '',
    password: '',
    isEncrypted: true,
    stage: 1,
    forceSMS: false,
    byQrCode: false,
  };
}

function getBlueskyInputs(account: any = {}) {
  return {
    identifier: account && (account.username || account.accountId) || '',
    appPassword: '',
    isEncrypted: account && account.isEncrypted !== undefined ? !!account.isEncrypted : true,
    stage: 0
  };
}
