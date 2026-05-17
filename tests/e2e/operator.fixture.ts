import Vue from 'vue';
import VueMaterial from 'vue-material';
import 'vue-material/dist/vue-material.min.css';
import '../../src/styles/main.scss';
import PinServices from '../../src/pages/UsersSection/UserProfile/PinServices/PinServices';
import StorageSpacePage from '../../src/pages/StorageSpacePage/StorageSpacePage';
import UploadContent from '../../src/directives/UploadContent/UploadContent';

const calls: any[] = [];
const accounts = [
  {
    id: 1,
    name: 'pinata-main',
    service: 'pinata',
    endpoint: '',
    apiKey: 'visible-test-key',
    isEncrypted: true
  }
];
const storageOverview = {
  contentRowsCount: 8,
  contentStorageObjectsCount: 5,
  logicalContentBytes: 4608,
  physicalContentBytes: 3072,
  duplicateStorageIdsCount: 2,
  duplicateContentRowsCount: 3,
  fileCatalogItemsCount: 4,
  fileCatalogLogicalBytes: 3072,
  groupPostsCount: 6,
  groupPostsLogicalBytes: 2560,
  pinnedStorageObjectsCount: 2,
  pinnedPhysicalBytes: 1536
};
const typeBreakdown = [
  {mimeType: 'image/png', extension: 'png', contentRowsCount: 3, storageObjectsCount: 2, logicalBytes: 2048, physicalBytes: 1536},
  {mimeType: 'text/plain', extension: 'txt', contentRowsCount: 2, storageObjectsCount: 2, logicalBytes: 1024, physicalBytes: 1024}
];
const topContents = [
  {id: 11, userId: 7, name: 'poster.png', mimeType: 'image/png', extension: 'png', storageId: 'bafy-content-poster', size: 2048},
  {id: 12, userId: 7, name: 'notes.txt', mimeType: 'text/plain', extension: 'txt', storageId: 'bafy-content-notes', size: 1024}
];
const topFileCatalogItems = [
  {id: 21, userId: 7, groupId: 31, contentId: 11, name: 'archive.zip', mimeType: 'application/zip', extension: 'zip', storageId: 'bafy-catalog-archive', size: 3072}
];
const topGroups = [
  {id: 31, name: 'test-channel', title: 'Test Channel', size: 1600, availablePostsCount: 4}
];

Vue.use(VueMaterial);
Vue.component('upload-content', UploadContent);
Vue.component('pretty-hex', {
  props: ['hex'],
  template: '<span class="pretty-hex">{{hex || "-"}}</span>'
});
Vue.filter('prettyName', (value) => String(value || '').replace(/[_-]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()));
Vue.filter('prettySize', prettySize);

Vue.prototype.$notify = (payload) => {
  calls.push({type: 'notify', payload});
};

Vue.prototype.$geesome = {
  async getUserPinAccounts() {
    calls.push({type: 'getUserPinAccounts'});
    return {list: accounts};
  },
  async createPinAccount(accountData) {
    calls.push({type: 'createPinAccount', accountData});
    return {...accountData, id: 2};
  },
  async updatePinAccount(accountId, accountData) {
    calls.push({type: 'updatePinAccount', accountId, accountData});
    return {...accountData, id: accountId};
  },
  async deletePinAccount(accountId) {
    calls.push({type: 'deletePinAccount', accountId});
    return {success: true};
  },
  async saveFile(file, params) {
    calls.push({type: 'saveFile', fileName: file.name, params});
    return {id: 77, storageId: 'bafy-pin-services-upload'};
  },
  async pinContentByUserAccount(accountName, storageId, options) {
    calls.push({type: 'pinContentByUserAccount', accountName, storageId, options});
    return {status: 200, statusText: 'OK', data: {IpfsHash: storageId}};
  },
  async adminGetStorageSpaceOverview() {
    calls.push({type: 'adminGetStorageSpaceOverview'});
    return storageOverview;
  },
  async adminGetStorageSpaceTypeBreakdown(listParams) {
    calls.push({type: 'adminGetStorageSpaceTypeBreakdown', listParams});
    return typeBreakdown;
  },
  async adminGetStorageSpaceTopContents(listParams) {
    calls.push({type: 'adminGetStorageSpaceTopContents', listParams});
    return topContents;
  },
  async adminGetStorageSpaceTopFileCatalogItems(listParams) {
    calls.push({type: 'adminGetStorageSpaceTopFileCatalogItems', listParams});
    return topFileCatalogItems;
  },
  async adminGetStorageSpaceTopGroups(listParams) {
    calls.push({type: 'adminGetStorageSpaceTopGroups', listParams});
    return topGroups;
  }
};

(window as any).__PIN_SERVICES_E2E__ = {calls};
(window as any).__STORAGE_SPACE_E2E__ = {calls};

new Vue({
  el: '#app',
  components: {PinServices, StorageSpacePage},
  data() {
    return {
      currentPage: window.location.hash === '#storage-space' ? 'storage-space' : 'pin-services'
    };
  },
  template: `
    <main>
      <storage-space-page v-if="currentPage === 'storage-space'" />
      <pin-services v-else />
    </main>
  `
});

function prettySize(value) {
  let size = Number(value || 0);
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size = size / 1024;
    unitIndex += 1;
  }

  return `${Math.round(size * 10) / 10} ${units[unitIndex]}`;
}
