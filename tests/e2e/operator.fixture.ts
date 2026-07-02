import Vue from 'vue';
import VueMaterial from 'vue-material';
import 'vue-material/dist/vue-material.min.css';
import '../../src/styles/main.scss';
import PostItem from '../../src/directives/Posts/PostItem/PostItem';
import PinServices from '../../src/pages/UsersSection/UserProfile/PinServices/PinServices';
import StorageSpacePage from '../../src/pages/StorageSpacePage/StorageSpacePage';
import ContentManifestItem from '../../src/directives/ContentManifestItem/ContentManifestItem';
import ActivityPubRemoteObjectsPage from '../../src/pages/GroupPage/ActivityPubRemoteObjectsPage/ActivityPubRemoteObjectsPage';
import ActivityPubSourcesPage from '../../src/pages/ActivityPubSourcesPage/ActivityPubSourcesPage';
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
const availabilitySignals = [
  {
    storageId: 'bafy-availability-poster',
    physicalBytes: 2048,
    contentRowsCount: 2,
    activeFileCatalogRefsCount: 1,
    groupPostRefsCount: 3,
    generatedOutputRefsCount: 0,
    localPinRefsCount: 1,
    remotePinsCount: 2,
    maxPeerCount: 7
  },
  {
    storageId: 'bafy-availability-notes',
    physicalBytes: 1024,
    contentRowsCount: 1,
    activeFileCatalogRefsCount: 0,
    groupPostRefsCount: 1,
    generatedOutputRefsCount: 1,
    localPinRefsCount: 0,
    remotePinsCount: 0,
    maxPeerCount: 1
  }
];
const availabilityInspection = [
  {
    storageId: 'bafy-availability-poster',
    providerLookupOk: true,
    providersCount: 2,
    providersTruncated: false,
    providerLookupDurationMs: 120,
    providers: [{id: 'peer-a', multiaddrs: ['/ip4/127.0.0.1/tcp/4001'], protocols: [], source: 'kubo-routing'}],
    retrievalStatOk: true,
    retrievalStatDurationMs: 80,
    retrievalType: 'file',
    retrievalMeasuredBytes: 2048
  },
  {
    storageId: 'bafy-availability-notes',
    providerLookupOk: true,
    providersCount: 1,
    providersTruncated: false,
    providerLookupDurationMs: 70,
    providers: [{id: 'peer-b', multiaddrs: ['/ip4/127.0.0.2/tcp/4001'], protocols: [], source: 'kubo-routing'}],
    retrievalStatOk: false,
    retrievalStatDurationMs: 5000,
    retrievalMeasuredBytes: 0,
    retrievalErrorMessage: 'stat timeout'
  }
];
const availabilitySamples = [
  {
    id: 101,
    userId: 7,
    storageId: 'bafy-availability-poster',
    providerLookupOk: true,
    providersCount: 3,
    providersTruncated: false,
    providerLookupDurationMs: 110,
    providers: [{id: 'peer-saved', multiaddrs: ['/ip4/127.0.0.10/tcp/4001'], protocols: [], source: 'kubo-routing'}],
    retrievalStatOk: true,
    retrievalStatDurationMs: 75,
    retrievalType: 'file',
    retrievalMeasuredBytes: 2048,
    sampledAt: '2026-05-22T08:30:00.000Z'
  }
];
const postFixtureGroup = {
  id: 31,
  staticId: 'test-channel',
  name: 'test-channel',
  title: 'Test Channel'
};
const postFixtureContent = [
  '<p onclick="alert(1)">Hello <strong>safe post</strong></p>',
  '<script>window.__geesomePostXss = true</script>',
  '<a href="javascript:alert(2)">bad link</a>',
  '<a href="https://example.com/safe" target="_blank">safe link</a>',
  '<a href="ipfs://bafybeigdyrzt">ipfs link</a>',
  '<iframe src="https://example.com/embed"></iframe>',
  '<span style="color:red">unstyled text</span>'
].join('');
const postFixture = {
  id: 7,
  localId: 7,
  groupId: postFixtureGroup.staticId,
  manifestId: 'bafy-post-manifest',
  publishedAt: 1767225600,
  contents: [{
    position: 0,
    view: 'contents',
    storageId: {
      storageId: 'bafy-post-text',
      mimeType: 'text/html',
      extension: 'html'
    }
  }]
};
const activityPubGroup = {
  id: 31,
  name: 'test-channel',
  title: 'Test Channel',
  staticId: 'bafz-test-channel',
  postsCount: 4
};
const activityPubRemoteObjects = [
  {
    id: 501,
    objectId: 'https://remote.example/objects/reply-1',
    objectType: 'Note',
    visibility: 'public',
    reviewState: 'pending',
    localPostId: null,
    remoteActor: {
      preferredUsername: 'alice',
      actorUrl: 'https://remote.example/users/alice'
    },
    preview: {
      name: 'Remote reply',
      contentText: 'Remote reply for review',
      summaryText: 'Remote summary',
      url: 'https://remote.example/@alice/reply-1'
    }
  },
  {
    id: 502,
    objectId: 'https://remote.example/objects/article-1',
    objectType: 'Article',
    visibility: 'public',
    reviewState: 'pending',
    localPostId: null,
    remoteActor: {
      preferredUsername: 'bob',
      actorUrl: 'https://remote.example/users/bob'
    },
    preview: {
      name: 'Remote article',
      contentText: 'Article waits for richer object policy'
    }
  }
];
const activityPubAttachments = [
  {
    url: 'https://remote.example/media/photo.png',
    type: 'Image',
    mediaType: 'image/png',
    mediaCategory: 'image',
    name: 'Remote image',
    width: 640,
    height: 480
  },
  {
    url: 'ipfs://bafyremoteattachment',
    type: 'Link',
    mediaCategory: 'link',
    name: 'IPFS source'
  }
];
const activityPubAttachmentPolicy = {
  mode: 'provenanceOnly',
  defaultMode: 'provenanceOnly',
  canImportRemoteBytes: true,
  supportedModes: ['provenanceOnly', 'backupOnCreate']
};
const activityPubSourceActor = {
  id: 11,
  preferredUsername: 'bsky.app',
  domain: 'bsky.brid.gy',
  actorUrl: 'https://bsky.brid.gy/ap/bsky.app'
};
let activityPubSources = [
  {
    id: 601,
    userId: 7,
    remoteActorId: activityPubSourceActor.id,
    displayName: '@bsky.app via Bridgy Fed',
    sourceResource: 'acct:bsky.app@bsky.brid.gy',
    sourceActorUrl: 'https://bsky.brid.gy/ap/bsky.app',
    bridgeProvider: 'bridgy-bluesky',
    status: 'active',
    lastReadAt: null,
    unreadCount: 1,
    remoteActor: activityPubSourceActor
  }
];
let activityPubSourceFeedItems = [
  {
    id: 701,
    remoteActorId: activityPubSourceActor.id,
    objectId: 'https://bsky.brid.gy/ap/bsky.app/post/abc',
    objectType: 'Note',
    visibility: 'public',
    reviewState: 'pending',
    isUnread: true,
    publishedAt: '2026-06-02T12:00:00.000Z',
    remoteActor: activityPubSourceActor,
    preview: {
      name: 'Bluesky update',
      contentText: 'A new official Bluesky post bridged into ActivityPub.',
      summaryText: 'Official Bluesky post',
      url: 'https://bsky.app/profile/bsky.app/post/abc',
      attachments: [
        {
          url: 'https://cdn.example/image.png',
          mediaCategory: 'image',
          mediaType: 'image/png',
          name: 'Launch image',
          embedPolicy: {mode: 'inlineMedia'}
        }
      ]
    }
  }
];

Vue.use(VueMaterial);
Vue.component('upload-content', UploadContent);
Vue.component('content-manifest-item', ContentManifestItem);
Vue.component('router-link', {
  props: ['to'],
  template: '<a href="#"><slot></slot></a>'
});
Vue.component('pretty-hex', {
  props: ['hex'],
  template: '<span class="pretty-hex">{{hex || "-"}}</span>'
});
Vue.filter('prettyName', (value) => String(value || '').replace(/[_-]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()));
Vue.filter('prettySize', prettySize);

Vue.prototype.$notify = (payload) => {
  calls.push({type: 'notify', payload});
};
Vue.prototype.$store = {
  state: {
    cybActive: false
  }
};

Vue.prototype.$geesome = {
  async adminIsHaveCorePermission(permissionName) {
    calls.push({type: 'adminIsHaveCorePermission', permissionName});
    return permissionName === 'admin:all' || permissionName === 'admin:read';
  },
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
  async getGroup(groupId) {
    calls.push({type: 'getGroup', groupId});
    return postFixtureGroup;
  },
  async getContentLink(storageId) {
    calls.push({type: 'getContentLink', storageId});
    return `/ipfs/${storageId}`;
  },
  async getContentData(storageId) {
    calls.push({type: 'getContentData', storageId});
    if (storageId === 'bafy-post-text') {
      return postFixtureContent;
    }
    return '';
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
  },
  async adminGetStorageSpaceAvailabilitySignals(listParams) {
    calls.push({type: 'adminGetStorageSpaceAvailabilitySignals', listParams});
    return availabilitySignals;
  },
  async adminGetStorageSpaceAvailabilityNetworkSamples(listParams) {
    calls.push({type: 'adminGetStorageSpaceAvailabilityNetworkSamples', listParams});
    return availabilitySamples;
  },
  async adminInspectStorageSpaceAvailabilityNetworkSignals(listParams) {
    calls.push({type: 'adminInspectStorageSpaceAvailabilityNetworkSignals', listParams});
    if (listParams && listParams.storageId) {
      return availabilityInspection.filter(item => item.storageId === listParams.storageId);
    }
    return availabilityInspection;
  },
  async adminRefreshStorageSpaceAvailabilityNetworkSamples(listParams) {
    calls.push({type: 'adminRefreshStorageSpaceAvailabilityNetworkSamples', listParams});
    const rows = listParams && listParams.storageId
      ? availabilityInspection.filter(item => item.storageId === listParams.storageId)
      : availabilityInspection;
    return {
      sampled: rows.length,
      durationMs: 160,
      rows: rows.map((row, index) => ({
        ...row,
        id: 201 + index,
        userId: 7,
        sampledAt: '2026-05-22T09:00:00.000Z'
      }))
    };
  },
  async adminGetActivityPubRemoteObjects(groupName, filters) {
    calls.push({type: 'adminGetActivityPubRemoteObjects', groupName, filters});
    const reviewState = filters && filters.reviewState;
    const list = activityPubRemoteObjects.filter((item) => item.reviewState === reviewState);
    return {
      list,
      total: list.length
    };
  },
  async adminGetActivityPubRemoteObject(groupName, remoteObjectId) {
    calls.push({type: 'adminGetActivityPubRemoteObject', groupName, remoteObjectId});
    return activityPubRemoteObjects.find((item) => Number(item.id) === Number(remoteObjectId));
  },
  async adminGetActivityPubRemoteObjectPostDraft(groupName, remoteObjectId) {
    calls.push({type: 'adminGetActivityPubRemoteObjectPostDraft', groupName, remoteObjectId});
    const remoteObject = activityPubRemoteObjects.find((item) => Number(item.id) === Number(remoteObjectId));
    const accepted = remoteObject && remoteObject.reviewState === 'accepted';
    const canCreatePost = !!accepted && remoteObject.objectType === 'Note' && !remoteObject.localPostId;
    return {
      remoteObject,
      canCreatePost,
      reasons: canCreatePost ? [] : ['activitypub_remote_object_review_not_accepted'],
      contentText: remoteObject && remoteObject.preview && remoteObject.preview.contentText,
      title: remoteObject && remoteObject.preview && remoteObject.preview.name,
      attachments: remoteObject && remoteObject.id === 501 ? activityPubAttachments : [],
      attachmentImportPolicy: activityPubAttachmentPolicy
    };
  },
  async adminSetActivityPubRemoteObjectReviewState(groupName, remoteObjectId, input) {
    calls.push({type: 'adminSetActivityPubRemoteObjectReviewState', groupName, remoteObjectId, input});
    const remoteObject = activityPubRemoteObjects.find((item) => Number(item.id) === Number(remoteObjectId));
    if (remoteObject) {
      remoteObject.reviewState = input.state;
    }
    return remoteObject;
  },
  async adminCreateActivityPubRemoteObjectPost(groupName, remoteObjectId, options) {
    calls.push({type: 'adminCreateActivityPubRemoteObjectPost', groupName, remoteObjectId, options});
    const remoteObject = activityPubRemoteObjects.find((item) => Number(item.id) === Number(remoteObjectId));
    if (remoteObject) {
      remoteObject.localPostId = 88;
    }
    return {
      post: {id: 88, isRemote: true},
      remoteObject,
      attachmentBackups: options && options.importRemoteAttachments ? [
        {
          url: 'https://remote.example/media/photo.png',
          contentId: 301,
          storageId: 'saved-url-content-1',
          mediaType: 'image/png',
          mediaCategory: 'image',
          name: 'Remote image'
        }
      ] : []
    };
  },
  async adminResolveActivityPubSource(input) {
    calls.push({type: 'adminResolveActivityPubSource', input});
    return {
      actor: activityPubSourceActor,
      resource: input && (input.resource || input.handle || input.actorUrl)
    };
  },
  async adminGetActivityPubSourceSubscriptions(filters) {
    calls.push({type: 'adminGetActivityPubSourceSubscriptions', filters});
    return {
      list: activityPubSources.filter((source) => source.status !== 'removed'),
      total: activityPubSources.filter((source) => source.status !== 'removed').length
    };
  },
  async adminSubscribeActivityPubSource(input) {
    calls.push({type: 'adminSubscribeActivityPubSource', input});
    const existingSource = input && input.preset === 'bluesky-official'
      ? activityPubSources.find((item) => item.sourceResource === 'acct:bsky.app@bsky.brid.gy')
      : null;
    if (existingSource) {
      existingSource.displayName = input && input.displayName || existingSource.displayName;
      existingSource.status = 'active';
      return existingSource;
    }

    const source = {
      id: 602,
      userId: 7,
      remoteActorId: activityPubSourceActor.id,
      displayName: input && input.displayName || '@bsky.app via Bridgy Fed',
      sourceResource: input && input.resource || input && input.handle || 'acct:bsky.app@bsky.brid.gy',
      sourceActorUrl: input && input.actorUrl || 'https://bsky.brid.gy/ap/bsky.app',
      bridgeProvider: input && input.bridgeProvider || 'bridgy-bluesky',
      status: 'active',
      lastReadAt: null,
      unreadCount: 1,
      remoteActor: activityPubSourceActor
    };
    activityPubSources = activityPubSources.filter((item) => Number(item.id) !== Number(source.id)).concat([source]);
    return source;
  },
  async adminUpdateActivityPubSourceSubscription(sourceId, input) {
    calls.push({type: 'adminUpdateActivityPubSourceSubscription', sourceId, input});
    const source = activityPubSources.find((item) => Number(item.id) === Number(sourceId));
    if (source && input && input.status) {
      source.status = input.status;
    }
    return source;
  },
  async adminRemoveActivityPubSourceSubscription(sourceId) {
    calls.push({type: 'adminRemoveActivityPubSourceSubscription', sourceId});
    const source = activityPubSources.find((item) => Number(item.id) === Number(sourceId));
    if (source) {
      source.status = 'removed';
    }
    return {success: true};
  },
  async adminGetActivityPubSourceFeed(sourceId, filters) {
    calls.push({type: 'adminGetActivityPubSourceFeed', sourceId, filters});
    const source = activityPubSources.find((item) => Number(item.id) === Number(sourceId)) || activityPubSources[0];
    return {
      source,
      list: activityPubSourceFeedItems,
      total: activityPubSourceFeedItems.length
    };
  },
  async adminMarkActivityPubSourceRead(sourceId, input) {
    calls.push({type: 'adminMarkActivityPubSourceRead', sourceId, input});
    activityPubSourceFeedItems = activityPubSourceFeedItems.map((item) => ({...item, isUnread: false}));
    const source = activityPubSources.find((item) => Number(item.id) === Number(sourceId));
    if (source) {
      source.lastReadAt = '2026-06-02T12:30:00.000Z';
      source.unreadCount = 0;
    }
    return source;
  }
};

(window as any).__PIN_SERVICES_E2E__ = {calls};
(window as any).__STORAGE_SPACE_E2E__ = {calls};
(window as any).__POST_HTML_SAFETY_E2E__ = {calls};
(window as any).__ACTIVITYPUB_REVIEW_E2E__ = {calls, activityPubRemoteObjects};
(window as any).__ACTIVITYPUB_SOURCES_E2E__ = {calls, activityPubSources, activityPubSourceFeedItems};

new Vue({
  el: '#app',
  components: {PinServices, PostItem, StorageSpacePage, ActivityPubRemoteObjectsPage, ActivityPubSourcesPage},
  data() {
    return {
      currentPage: getCurrentPage(),
      postFixture,
      postFixtureGroup,
      activityPubGroup
    };
  },
  created() {
    (window as any).addEventListener('hashchange', () => {
      this.currentPage = getCurrentPage();
    });
  },
  template: `
    <main>
      <section v-if="currentPage === 'post-html-safety'" aria-label="Post HTML safety fixture">
        <h1>Post HTML safety</h1>
        <post-item :value="postFixture" :group="postFixtureGroup" />
      </section>
      <storage-space-page v-else-if="currentPage === 'storage-space'" />
      <activity-pub-sources-page v-else-if="currentPage === 'activitypub-sources'" />
      <activity-pub-remote-objects-page v-else-if="currentPage === 'activitypub'" :group="activityPubGroup" />
      <pin-services v-else />
    </main>
  `
});

function getCurrentPage() {
  if (window.location.hash === '#storage-space') {
    return 'storage-space';
  }
  if (window.location.hash === '#post-html-safety') {
    return 'post-html-safety';
  }
  if (window.location.hash === '#activitypub') {
    return 'activitypub';
  }
  if (window.location.hash === '#activitypub-sources') {
    return 'activitypub-sources';
  }
  return 'pin-services';
}

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
