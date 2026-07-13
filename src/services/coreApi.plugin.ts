/*
 * Copyright ©️ 2018-2020 Galt•Project Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka)
 *
 * Copyright ©️ 2018-2020 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) by
 * [Basic Agreement](ipfs/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS)).
 */

const { GeesomeClient, BrowserLocalClientStorage } = require('geesome-libs/src/GeesomeClient');
// const SimpleAccountStorage = require('geesome-libs/src/SimpleAccountStorage');
const commonHelpers = require("geesome-libs/src/common");
const geesomeWalletClientLib = require('geesome-wallet-client/src/lib');
const includes = require('lodash/includes');

export default {
  install(Vue, options: any = {}) {
    let appStore;
    let notify;

    let geesomeClient;

    Vue.prototype.$geesome = {
      async init($vueInstance) {
        // const FluenceService = require('geesome-libs/src/fluenceService');
        // const { krasnodar } = require('@fluencelabs/fluence-network-environment');
        // const { FluencePeer } = require("@fluencelabs/fluence");

        appStore = $vueInstance.$store;
        notify = $vueInstance.$notify;

        let server = process.env.SERVER || localStorage.getItem('geesome-server');
        let apiKey = localStorage.getItem('geesome-api-key');

        geesomeClient = new GeesomeClient({
          server,
          apiKey: commonHelpers.isUndefined(apiKey) ? null : apiKey,
          clientStorage: new BrowserLocalClientStorage()
        });
        appStore.commit('serverAddress', geesomeClient.server);
        localStorage.setItem('geesome-server', geesomeClient.server);

        await geesomeClient.init();
        await geesomeClient.initBrowserIpfsNode();

        // const storage = new SimpleAccountStorage();
        // const peer = new FluencePeer();
        // peer.start({
        //   connectTo: krasnodar[1],
        // }).then(() => {
        //   return geesomeClient.setCommunicator(new FluenceService(storage, peer));
        // });

        // TODO: solve extending class problem: https://stackoverflow.com/q/51860043
        Object.getOwnPropertyNames(Object.getPrototypeOf(geesomeClient))
            .filter(item => typeof geesomeClient[item] === 'function' && item !== 'constructor')
            .forEach(methodName => {
              if (includes(['setup', 'getApiToken', 'loginPassword', 'loginAuthMessage', 'loginApiKey', 'logout', 'saveFile', 'saveContentData', 'saveDataByUrl', 'onProcess', 'onError'], methodName)) {
                return;
              }
              this[methodName] = geesomeClient[methodName].bind ? geesomeClient[methodName].bind(geesomeClient) : geesomeClient[methodName];
            });

        // await geesomeClient.ipfsService.subscribeToEvent('geesome-test', (data) => {
        //   console.log('geesome-test', data);
        // })
      },

      async setup(setupData) {
        const result = await geesomeClient.setup(setupData);
        localStorage.setItem('geesome-api-key', result.apiKey);
        console.log('geesomeClient.apiKey', geesomeClient.apiKey);
        return result;
      },

      getApiToken() {
        return geesomeClient.apiKey;
      },

      async loginPassword(server, username, password) {
        localStorage.setItem('geesome-server', server);
        appStore.commit('serverAddress', server);

        await geesomeClient.setServer(server);
        const data = await geesomeClient.loginPassword(username, password);
        localStorage.setItem('geesome-api-key', data.apiKey);
        return data;
      },

      async loginAuthMessage(server, authMessageId, accountAddress, signature, params) {
        localStorage.setItem('geesome-server', server);
        appStore.commit('serverAddress', server);

        await geesomeClient.setServer(server);
        const data = await geesomeClient.loginAuthMessage(authMessageId, accountAddress, signature, params);
        localStorage.setItem('geesome-api-key', data.apiKey);
        return data;
      },

      async loginApiKey(server, apiKey) {
        localStorage.setItem('geesome-server', server);
        appStore.commit('serverAddress', server);

        await geesomeClient.setServer(server);
        geesomeClient.setApiKey(apiKey);
        localStorage.setItem('geesome-api-key', apiKey);
        return {user: await geesomeClient.getCurrentUser(), apiKey};
      },

      async logout() {
        await geesomeClient.logout();
        //TODO: send request to server for disable api key
        localStorage.setItem('geesome-api-key', null);
      },


      saveFile(file, params: any = {}) {
        params.onProcess = this.onProcess;
        return geesomeClient.saveFile(file, params).catch(this.onError);
      },

      saveContentData(content, params: any = {}) {
        params.onProcess = this.onProcess;
        return geesomeClient.saveContentData(content, params).catch(this.onError);
      },

      saveDataByUrl(url, params: any = {}) {
        params.onProcess = this.onProcess;
        return geesomeClient.saveDataByUrl(url, params).catch(this.onError);
      },

      getUserPinAccounts() {
        return geesomeClient.getRequest('user/pin/user-accounts').catch(this.onError);
      },

      getGroupPinAccounts(groupId) {
        return geesomeClient.getRequest(`user/pin/group-accounts/${encodeURIComponent(groupId)}`).catch(this.onError);
      },

      createPinAccount(accountData) {
        return geesomeClient.postRequest('user/pin/create-account', accountData).catch(this.onError);
      },

      updatePinAccount(accountId, accountData) {
        return geesomeClient.postRequest(`user/pin/update-account/${accountId}`, accountData).catch(this.onError);
      },

      deletePinAccount(accountId) {
        return geesomeClient.postRequest(`user/pin/delete-account/${accountId}`).catch(this.onError);
      },

      pinContentByUserAccount(accountName, storageId, options: any = {}) {
        return geesomeClient.postRequest(
          `user/pin/account/${encodeURIComponent(accountName)}/pin-content/${encodeURIComponent(storageId)}/by-user`,
          options
        ).catch(this.onError);
      },

      adminGetStorageSpaceOverview() {
        return geesomeClient.getRequest('admin/storage-space/overview').catch(this.onError);
      },

      adminGetStorageSpaceTypeBreakdown(listParams: any = {}) {
        return geesomeClient.getRequest('admin/storage-space/type-breakdown', {params: listParams}).catch(this.onError);
      },

      adminGetStorageSpaceTopContents(listParams: any = {}) {
        return geesomeClient.getRequest('admin/storage-space/top-contents', {params: listParams}).catch(this.onError);
      },

      adminGetStorageSpaceTopFileCatalogItems(listParams: any = {}) {
        return geesomeClient.getRequest('admin/storage-space/top-file-catalog-items', {params: listParams}).catch(this.onError);
      },

      adminGetStorageSpaceTopGroups(listParams: any = {}) {
        return geesomeClient.getRequest('admin/storage-space/top-groups', {params: listParams}).catch(this.onError);
      },

      adminGetStorageSpaceAvailabilitySignals(listParams: any = {}) {
        return geesomeClient.getRequest('admin/storage-space/availability-signals', {params: listParams}).catch(this.onError);
      },

      adminInspectStorageSpaceAvailabilityNetworkSignals(listParams: any = {}) {
        return geesomeClient.getRequest('admin/storage-space/availability-network-inspection', {params: listParams}).catch(this.onError);
      },

      adminGetStorageSpaceAvailabilityNetworkSamples(listParams: any = {}) {
        return geesomeClient.getRequest('admin/storage-space/availability-network-samples', {params: listParams}).catch(this.onError);
      },

      adminRefreshStorageSpaceAvailabilityNetworkSamples(listParams: any = {}) {
        return geesomeClient.postRequest('admin/storage-space/availability-network-samples/refresh', listParams).catch(this.onError);
      },

      adminGetActivityPubRemoteObjects(groupName, filters: any = {}) {
        return geesomeClient.getRequest(
          `admin/activity-pub/groups/${encodeURIComponent(groupName)}/remote-objects`,
          {params: filters}
        ).catch(this.onError);
      },

      adminGetActivityPubRemoteObject(groupName, remoteObjectId) {
        return geesomeClient.getRequest(
          `admin/activity-pub/groups/${encodeURIComponent(groupName)}/remote-objects/${encodeURIComponent(remoteObjectId)}`
        ).catch(this.onError);
      },

      adminGetActivityPubRemoteObjectPostDraft(groupName, remoteObjectId) {
        return geesomeClient.getRequest(
          `admin/activity-pub/groups/${encodeURIComponent(groupName)}/remote-objects/${encodeURIComponent(remoteObjectId)}/post-draft`
        ).catch(this.onError);
      },

      adminSetActivityPubRemoteObjectReviewState(groupName, remoteObjectId, input) {
        return geesomeClient.postRequest(
          `admin/activity-pub/groups/${encodeURIComponent(groupName)}/remote-objects/${encodeURIComponent(remoteObjectId)}/review-state`,
          input
        ).catch(this.onError);
      },

      adminCreateActivityPubRemoteObjectPost(groupName, remoteObjectId, options: any = {}) {
        return geesomeClient.postRequest(
          `admin/activity-pub/groups/${encodeURIComponent(groupName)}/remote-objects/${encodeURIComponent(remoteObjectId)}/post`,
          options
        ).catch(this.onError);
      },

      adminResolveActivityPubSource(input: any = {}) {
        return geesomeClient.postRequest('admin/activity-pub/sources/resolve', input).catch(this.onError);
      },

      adminGetActivityPubSourceSubscriptions(filters: any = {}) {
        return geesomeClient.getRequest('admin/activity-pub/sources', {params: filters}).catch(this.onError);
      },

      adminSubscribeActivityPubSource(input: any = {}) {
        return geesomeClient.postRequest('admin/activity-pub/sources', input).catch(this.onError);
      },

      adminUpdateActivityPubSourceSubscription(sourceId, input: any = {}) {
        return geesomeClient.postRequest(
          `admin/activity-pub/sources/${encodeURIComponent(sourceId)}/update`,
          input
        ).catch(this.onError);
      },

      adminRemoveActivityPubSourceSubscription(sourceId) {
        return geesomeClient.postRequest(
          `admin/activity-pub/sources/${encodeURIComponent(sourceId)}/remove`
        ).catch(this.onError);
      },

      adminGetActivityPubSourceFeed(sourceId, filters: any = {}) {
        return geesomeClient.getRequest(
          `admin/activity-pub/sources/${encodeURIComponent(sourceId)}/feed`,
          {params: filters}
        ).catch(this.onError);
      },

      adminMarkActivityPubSourceRead(sourceId, input: any = {}) {
        return geesomeClient.postRequest(
          `admin/activity-pub/sources/${encodeURIComponent(sourceId)}/read`,
          input
        ).catch(this.onError);
      },

      adminGetBlueskySourceSubscriptions(filters: any = {}) {
        return geesomeClient.getRequest('admin/bluesky/sources', {params: filters}).catch(this.onError);
      },

      adminSubscribeBlueskySource(input: any = {}) {
        return geesomeClient.postRequest('admin/bluesky/sources', input).catch(this.onError);
      },

      adminUpdateBlueskySourceSubscription(sourceId, input: any = {}) {
        return geesomeClient.postRequest(
          `admin/bluesky/sources/${encodeURIComponent(sourceId)}/update`,
          input
        ).catch(this.onError);
      },

      adminRemoveBlueskySourceSubscription(sourceId) {
        return geesomeClient.postRequest(
          `admin/bluesky/sources/${encodeURIComponent(sourceId)}/remove`
        ).catch(this.onError);
      },

      adminGetBlueskySourceFeed(sourceId, filters: any = {}) {
        return geesomeClient.getRequest(
          `admin/bluesky/sources/${encodeURIComponent(sourceId)}/feed`,
          {params: filters}
        ).catch(this.onError);
      },

      adminGetBlueskySourceReviews(sourceId, filters: any = {}) {
        return geesomeClient.getRequest(
          `admin/bluesky/sources/${encodeURIComponent(sourceId)}/reviews`,
          {params: filters}
        ).catch(this.onError);
      },

      adminUpdateBlueskySourceReviewState(sourceId, reviewId, input: any = {}) {
        return geesomeClient.postRequest(
          `admin/bluesky/sources/${encodeURIComponent(sourceId)}/reviews/${encodeURIComponent(reviewId)}/state`,
          input
        ).catch(this.onError);
      },

      adminImportBlueskySourceReview(sourceId, reviewId, input: any = {}) {
        return geesomeClient.postRequest(
          `admin/bluesky/sources/${encodeURIComponent(sourceId)}/reviews/${encodeURIComponent(reviewId)}/import`,
          input
        ).catch(this.onError);
      },

      adminRefreshBlueskySourceSubscription(sourceId, input: any = {}) {
        return geesomeClient.postRequest(
          `admin/bluesky/sources/${encodeURIComponent(sourceId)}/refresh`,
          input
        ).catch(this.onError);
      },

      adminSyncBlueskySourcePosts(sourceId, input: any = {}) {
        return geesomeClient.postRequest(
          `admin/bluesky/sources/${encodeURIComponent(sourceId)}/sync`,
          input
        ).catch(this.onError);
      },

      userBlueskyLogin(input: any = {}) {
        const loginInput = {...input};
        const appPassword = getBlueskyAppPassword(loginInput);
        if (loginInput.isEncrypted && appPassword && !loginInput.encryptedApiKey) {
          loginInput.encryptedApiKey = this.getEncryptedSocNetApiKey(appPassword);
        }
        return geesomeClient.postRequest('soc-net/bluesky/login', loginInput).catch(this.onError);
      },

      getEncryptedSocNetApiKey(apiKey) {
        return geesomeWalletClientLib.encrypt(geesomeClient.apiKeyHash(), apiKey);
      },

      userBlueskyVerifyAccount(input: any = {}) {
        return geesomeClient.postRequest('soc-net/bluesky/verify-account', input).catch(this.onError);
      },

      userBlueskyMigrationPreview(input: any = {}) {
        return geesomeClient.postRequest('soc-net/bluesky/migration/preview', input).catch(this.onError);
      },

      userBlueskyMigrationImport(input: any = {}) {
        return geesomeClient.postRequest('soc-net/bluesky/migration/import', input).catch(this.onError);
      },

      userBlueskyMigrationReconcileRelations(input: any = {}) {
        return geesomeClient.postRequest('soc-net/bluesky/migration/reconcile-relations', input).catch(this.onError);
      },

      userActivityPubMigrationPreview(input: any = {}) {
        return geesomeClient.postRequest('soc-net/activity-pub/migration/preview', input).catch(this.onError);
      },

      userActivityPubMigrationImport(input: any = {}) {
        return geesomeClient.postRequest('soc-net/activity-pub/migration/import', input).catch(this.onError);
      },

      userActivityPubMigrationReconcileRelations(input: any = {}) {
        return geesomeClient.postRequest('soc-net/activity-pub/migration/reconcile-relations', input).catch(this.onError);
      },

      userBlueskyCrossPost(postId, input: any = {}) {
        return geesomeClient.postRequest(
          `soc-net/bluesky/posts/${encodeURIComponent(postId)}/cross-post`,
          input
        ).catch(this.onError);
      },

      userBlueskyUpdateCrossPost(postId, input: any = {}) {
        return geesomeClient.postRequest(
          `soc-net/bluesky/posts/${encodeURIComponent(postId)}/update-cross-post`,
          input
        ).catch(this.onError);
      },

      userBlueskyDeleteCrossPost(postId, input: any = {}) {
        return geesomeClient.postRequest(
          `soc-net/bluesky/posts/${encodeURIComponent(postId)}/delete-cross-post`,
          input
        ).catch(this.onError);
      },

      onProcess(process) {
        if(!process.percent) {
          return;
        }
        // notify({
        //   group: 'loading',
        //   clean: true
        // });
        notify({
          type: 'success',
          title: `Process: ${Math.round(process.percent * 100) / 100}%`,
          group: 'loading'
        });
      },

      onError(err) {
        notify({
          type: 'error',
          title: `Error`,
          text: err.message
        });
        throw err;
      }
    };

    Vue.prototype.$geesome = Vue.prototype.$geesome;
  }
}

function getBlueskyAppPassword(input: any = {}) {
  return input.appPassword || input.password || input.apiKey || '';
}
