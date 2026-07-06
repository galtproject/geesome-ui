/*
 * Copyright ©️ 2018-2020 Galt•Project Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka)
 *
 * Copyright ©️ 2018-2020 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) by
 * [Basic Agreement](ipfs/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS)).
 */

import ImageModal from "../../../modals/ImageModal/ImageModal";
import CybLinkKeywordsModal from "../../../modals/CybLinkKeywordsModal/CybLinkKeywordsModal";

const _ = require('lodash');
const moment = require('moment');
const defaultBlueskyCrossPostMediaPolicy = {
  images: 'upload',
  imageUploadFailure: 'link',
  attachments: 'card',
  linkPreviews: 'card'
};
const defaultBlueskyCrossPostRelationPolicy = {
  replies: 'require',
  quotes: 'require'
};
const blueskyCrossPostImagePolicyValues = ['upload', 'link', 'reject'];
const blueskyCrossPostImageUploadFailurePolicyValues = ['link', 'reject'];
const blueskyCrossPostFallbackPolicyValues = ['card', 'link', 'reject', 'ignore'];
const blueskyCrossPostRelationPolicyValues = ['require', 'omit'];

export default {
  template: require('./PostItem.template'),
  props: ['value', 'group', 'showBlueskyControls'],
  async created() {
    this.getGroup();
    this.getBlueskyAccounts();
  },

  async mounted() {

  },

  methods: {
    async getGroup() {
      if (this.group) {
        this.localGroup = this.group;
        return;
      }
      if (!this.value.groupId) {
        this.localGroup = null;
        return;
      }
      this.localGroup = await this.$geesome.getGroup(this.value.groupId);
    },
    async getBlueskyAccounts() {
      if (!this.showBlueskyControls) {
        return;
      }

      this.blueskyLoadingAccounts = true;
      this.blueskyErrorMessage = null;

      try {
        const result = await this.$geesome.socNetDbAccountList({socNet: 'bluesky'});
        const list = Array.isArray(result && result.list) ? result.list : Array.isArray(result) ? result : [];
        this.blueskyAccounts = list.filter(account => account && account.socNet === 'bluesky');
        if (this.blueskyAccounts.length && !this.selectedBlueskyAccountId) {
          this.selectedBlueskyAccountId = this.blueskyAccounts[0].id;
        }
      } catch (e) {
        this.blueskyErrorMessage = getErrorMessage(e, 'Could not load Bluesky accounts');
      }

      this.blueskyLoadingAccounts = false;
    },
    async crossPostToBluesky() {
      await this.runBlueskyAction(
        () => this.$geesome.userBlueskyCrossPost(this.value.id, this.getBlueskyActionInput()),
        (result) => `Posted to Bluesky${result && result.alreadyExists ? ' already' : ''}`
      );
    },
    async updateBlueskyCrossPost() {
      await this.runBlueskyAction(
        () => this.$geesome.userBlueskyUpdateCrossPost(this.value.id, this.getBlueskyActionInput()),
        () => 'Updated Bluesky post'
      );
    },
    async deleteBlueskyCrossPost() {
      await this.runBlueskyAction(
        () => this.$geesome.userBlueskyDeleteCrossPost(this.value.id, this.getBlueskyActionInput({includePolicy: false})),
        () => 'Deleted Bluesky post',
        {removeRecord: true}
      );
    },
    async runBlueskyAction(action, getSuccessMessage, options: any = {}) {
      if (!this.selectedBlueskyAccount || this.blueskyActionLoading) {
        return;
      }

      this.blueskyActionLoading = true;
      this.blueskyErrorMessage = null;
      this.blueskySuccessMessage = null;

      try {
        const result = await action();
        if (options.removeRecord) {
          this.removeBlueskyRecord(result);
        } else {
          this.applyBlueskyRecord(result);
        }
        this.blueskySuccessMessage = getSuccessMessage(result);
      } catch (e) {
        this.blueskyErrorMessage = getErrorMessage(e, 'Bluesky action failed');
      }

      this.blueskyActionLoading = false;
    },
    getBlueskyActionInput(options: any = {}) {
      const input: any = {
        accountData: {id: this.selectedBlueskyAccount.id}
      };
      const appPassword = this.blueskyAppPassword.trim();
      if (appPassword) {
        input.appPassword = appPassword;
      }
      if (options.includePolicy !== false) {
        input.mediaPolicy = getBlueskyCrossPostMediaPolicyInput(this.blueskyMediaPolicy);
        input.relationPolicy = getBlueskyCrossPostRelationPolicyInput(this.blueskyRelationPolicy);
      }
      return input;
    },
    getBlueskyAccountLabel(account) {
      return getBlueskyAccountLabel(account);
    },
    applyBlueskyRecord(result) {
      if (!result || !result.did || !result.record) {
        return;
      }

      const properties = getPostProperties(this.value);
      const bluesky = getPlainObject(properties.bluesky);
      const crossPosts = getPlainObject(bluesky.crossPosts);
      const nextCrossPosts = {
        ...crossPosts,
        [result.did]: {
          ...(crossPosts[result.did] || {}),
          uri: result.record.uri,
          cid: result.record.cid,
          did: result.did,
          handle: result.handle,
          accountId: result.account && result.account.id,
          postedAt: crossPosts[result.did] && crossPosts[result.did].postedAt || new Date().toISOString()
        }
      };
      this.setPostProperties({
        ...properties,
        bluesky: {
          ...bluesky,
          crossPosts: nextCrossPosts
        }
      });
    },
    removeBlueskyRecord(result) {
      const did = result && result.did || this.selectedBlueskyAccount && this.selectedBlueskyAccount.accountId;
      if (!did) {
        return;
      }

      const properties = getPostProperties(this.value);
      const bluesky = getPlainObject(properties.bluesky);
      const crossPosts = getPlainObject(bluesky.crossPosts);
      const nextCrossPosts = {...crossPosts};
      delete nextCrossPosts[did];
      this.setPostProperties({
        ...properties,
        bluesky: {
          ...bluesky,
          crossPosts: nextCrossPosts
        }
      });
    },
    setPostProperties(properties) {
      this.$set(this.value, 'propertiesJson', properties);
    },
    link() {
      this.$root.$asyncModal.open({
        id: 'cyb-link-keywords-modal',
        component: CybLinkKeywordsModal,
        props: {'contentHash': this.value.manifestId},
        options: {closeOnBackdrop: true}
      });
      // const event = document.createEvent('Event');
      // event.initEvent('cyb:link');
      // document.dispatchEvent(event);
      // console.log('dispatchEvent', event);
    }
  },

  watch: {
    'value.group'() {
      this.getGroup();
    }
  },

  computed: {
    contentsList() {
      return _.orderBy(this.value.contents, ['position'], ['asc']);
    },
    date() {
      return moment(this.value.publishedAt * 1000).format('DD.MM.YYYY h:mm:ss');
    },
    cybActive() {
      return this.$store.state.cybActive;
    },
    selectedBlueskyAccount() {
      return this.blueskyAccounts.find(account => String(account.id) === String(this.selectedBlueskyAccountId));
    },
    hasBlueskyAccounts() {
      return this.blueskyAccounts.length > 0;
    },
    selectedBlueskyRecord() {
      const account = this.selectedBlueskyAccount;
      if (!account || !account.accountId) {
        return null;
      }
      const properties = getPostProperties(this.value);
      const crossPosts = properties.bluesky && properties.bluesky.crossPosts || {};
      return crossPosts[account.accountId] || null;
    },
    selectedBlueskyRecordUrl() {
      return getBlueskyRecordUrl(this.selectedBlueskyRecord);
    },
    blueskyRelationNotice() {
      if (!this.showBlueskyControls) {
        return '';
      }
      const hasReply = hasPostRelation(this.value, 'replyToId', 'replyTo');
      const hasQuote = hasPostRelation(this.value, 'repostOfId', 'repostOf');
      if (!hasReply && !hasQuote) {
        return '';
      }
      return `${getBlueskyRelationLabel(hasReply, hasQuote)} context is preserved when related posts already have Bluesky records; otherwise GeeSome stops instead of flattening the post.`;
    },
    blueskyActionDisabled() {
      if (this.blueskyActionLoading || !this.selectedBlueskyAccount) {
        return true;
      }
      return !!this.selectedBlueskyAccount.isEncrypted && !this.blueskyAppPassword.trim();
    }
  },
  data() {
    return {
      localGroup: null,
      content: '',
      blueskyAccounts: [],
      selectedBlueskyAccountId: null,
      blueskyAppPassword: '',
      blueskyMediaPolicy: getDefaultBlueskyCrossPostMediaPolicy(),
      blueskyRelationPolicy: getDefaultBlueskyCrossPostRelationPolicy(),
      blueskyLoadingAccounts: false,
      blueskyActionLoading: false,
      blueskyErrorMessage: null,
      blueskySuccessMessage: null
    }
  },
}

function getPostProperties(post) {
  const properties = post && post.propertiesJson;
  if (!properties) {
    return {};
  }
  if (typeof properties === 'object') {
    return properties;
  }
  try {
    return JSON.parse(properties);
  } catch (e) {
    return {};
  }
}

function getPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function getDefaultBlueskyCrossPostMediaPolicy() {
  return {...defaultBlueskyCrossPostMediaPolicy};
}

function getDefaultBlueskyCrossPostRelationPolicy() {
  return {...defaultBlueskyCrossPostRelationPolicy};
}

function getBlueskyCrossPostMediaPolicyInput(policy: any = {}) {
  return {
    images: getAllowedPolicyValue(
      policy.images,
      blueskyCrossPostImagePolicyValues,
      defaultBlueskyCrossPostMediaPolicy.images
    ),
    imageUploadFailure: getAllowedPolicyValue(
      policy.imageUploadFailure,
      blueskyCrossPostImageUploadFailurePolicyValues,
      defaultBlueskyCrossPostMediaPolicy.imageUploadFailure
    ),
    attachments: getAllowedPolicyValue(
      policy.attachments,
      blueskyCrossPostFallbackPolicyValues,
      defaultBlueskyCrossPostMediaPolicy.attachments
    ),
    linkPreviews: getAllowedPolicyValue(
      policy.linkPreviews,
      blueskyCrossPostFallbackPolicyValues,
      defaultBlueskyCrossPostMediaPolicy.linkPreviews
    )
  };
}

function getBlueskyCrossPostRelationPolicyInput(policy: any = {}) {
  return {
    replies: getAllowedPolicyValue(
      policy.replies,
      blueskyCrossPostRelationPolicyValues,
      defaultBlueskyCrossPostRelationPolicy.replies
    ),
    quotes: getAllowedPolicyValue(
      policy.quotes,
      blueskyCrossPostRelationPolicyValues,
      defaultBlueskyCrossPostRelationPolicy.quotes
    )
  };
}

function getAllowedPolicyValue(value, allowedValues, fallback) {
  return allowedValues.includes(value) ? value : fallback;
}

function hasPostRelation(post, idField, objectField) {
  if (!post) {
    return false;
  }
  if (post[idField] !== undefined && post[idField] !== null) {
    return true;
  }
  return !!(post[objectField] && post[objectField].id !== undefined && post[objectField].id !== null);
}

function getBlueskyRelationLabel(hasReply, hasQuote) {
  if (hasReply && hasQuote) {
    return 'Reply and quote';
  }
  return hasReply ? 'Reply' : 'Quote';
}

function getBlueskyRecordUrl(record) {
  const uri = record && record.uri;
  if (!uri) {
    return '';
  }
  const match = String(uri).match(/^at:\/\/([^/]+)\/app\.bsky\.feed\.post\/([^/]+)$/);
  if (!match) {
    return '';
  }
  const actor = record.handle || record.did || match[1];
  return `https://bsky.app/profile/${encodeURIComponent(actor)}/post/${encodeURIComponent(match[2])}`;
}

function getBlueskyAccountLabel(account) {
  return account && (account.fullName || account.username || account.accountId) || 'Bluesky account';
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
