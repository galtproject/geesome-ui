import Vue from 'vue';
import VueMaterial from 'vue-material';
import 'vue-material/dist/vue-material.min.css';
import '../../src/styles/main.scss';
import PostItem from '../../src/directives/Posts/PostItem/PostItem';
import PinServices from '../../src/pages/UsersSection/UserProfile/PinServices/PinServices';
import StorageSpacePage from '../../src/pages/StorageSpacePage/StorageSpacePage';
import ContentManifestItem from '../../src/directives/ContentManifestItem/ContentManifestItem';
import NewPostControl from '../../src/pages/GroupPage/NewPostControl/NewPostControl';
import ActivityPubRemoteObjectsPage from '../../src/pages/GroupPage/ActivityPubRemoteObjectsPage/ActivityPubRemoteObjectsPage';
import ActivityPubSourcesPage from '../../src/pages/ActivityPubSourcesPage/ActivityPubSourcesPage';
import BlueskySourcesPage from '../../src/pages/BlueskySourcesPage/BlueskySourcesPage';
import SocialMigrationPage from '../../src/pages/SocialMigrationPage/SocialMigrationPage';
import UploadContent from '../../src/directives/UploadContent/UploadContent';
import AddSocNetClientModal from '../../src/pages/UsersSection/modals/AddSocNetClientModal/AddSocNetClientModal';

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
const postFixtureRichTextContent = {
  type: 'geesome.richText',
  version: 1,
  blocks: [
    {
      type: 'paragraph',
      children: [
        {text: 'Rich hello '},
        {text: 'formatted', marks: [{type: 'strong'}]},
        {text: ' with '},
        {
          text: 'safe rich link',
          marks: [{type: 'link', href: 'https://example.com/rich', title: 'Rich safe link'}]
        },
        {text: ' and unsafe rich link', marks: [{type: 'link', href: 'javascript:alert(3)'}]}
      ]
    },
    {
      type: 'blockquote',
      children: [{text: 'quoted rich text'}]
    },
    {
      type: 'codeBlock',
      text: '<script>window.__geesomeRichTextXss = true</script>'
    },
    {
      type: 'list',
      ordered: false,
      items: [
        {type: 'listItem', children: [{text: 'first rich item'}]},
        {type: 'listItem', children: [{text: 'second rich item'}]}
      ]
    }
  ]
};
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
  }, {
    position: 1,
    view: 'contents',
    storageId: 'bafy-post-rich-text',
    mimeType: 'application/vnd.geesome.rich-text+json',
    type: 'text',
    text: 'Rich hello formatted with safe rich link and unsafe rich link',
    json: postFixtureRichTextContent
  }]
};
const blueskyCrossPostAccount = {
  id: 41,
  userId: 7,
  socNet: 'bluesky',
  accountId: 'did:plc:artist',
  username: 'artist.bsky.social',
  fullName: '@artist.bsky.social',
  hasApiKey: true,
  isEncrypted: true
};
const blueskyPostFixture = {
  id: 8,
  localId: 8,
  groupId: postFixtureGroup.staticId,
  replyToId: 18,
  repostOfId: 19,
  manifestId: 'bafy-bluesky-post-manifest',
  publishedAt: 1767225600,
  propertiesJson: {},
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
const socialMigrationBlueskyPreview = {
  actor: 'bsky.app',
  cursor: 'cursor-preview',
  ownership: {
    claimed: true,
    verified: true,
    method: 'storedAccount',
    actor: 'bsky.app',
    reason: null
  },
  summary: {
    total: 2,
    localPosts: 1,
    remoteContextPosts: 1,
    replies: 1,
    reposts: 1,
    quotes: 0,
    remotePlaceholders: 2
  },
  list: [
    {
      uri: 'at://did:plc:bsky/app.bsky.feed.post/root',
      importKind: 'localPost',
      relationTypes: ['post'],
      preview: {
        name: 'Bluesky migration root',
        contentText: 'Own Bluesky post ready for GeeSome.'
      }
    },
    {
      uri: 'at://did:plc:other/app.bsky.feed.post/reply',
      importKind: 'remoteContext',
      relationTypes: ['reply'],
      preview: {
        name: 'Remote reply context',
        contentText: 'Reply from another account kept as context.'
      }
    }
  ]
};
const socialMigrationActivityPubPreview = {
  actor: 'https://remote.example/users/alice',
  sourceActorUrl: 'https://remote.example/users/alice',
  ownership: {
    claimed: true,
    verified: true,
    method: 'profileToken',
    actor: 'https://remote.example/users/alice',
    reason: null
  },
  summary: {
    total: 2,
    localPosts: 1,
    remoteContextPosts: 1,
    replies: 1,
    announces: 0,
    quotes: 0,
    mentions: 0,
    remoteActors: 1,
    remoteObjects: 1,
    remotePlaceholders: 2
  },
  list: [
    {
      objectId: 'https://remote.example/objects/root',
      objectType: 'Note',
      importKind: 'localPost',
      relationTypes: ['post'],
      preview: {
        name: 'ActivityPub migration root',
        contentText: 'Own ActivityPub post ready for GeeSome.'
      }
    },
    {
      objectId: 'https://other.example/objects/reply',
      objectType: 'Note',
      importKind: 'remoteContext',
      relationTypes: ['reply'],
      preview: {
        name: 'Remote reply context',
        contentText: 'ActivityPub reply kept as context.'
      }
    }
  ]
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
let blueskySources = [
  {
    id: 801,
    userId: 7,
    actor: 'bsky.app',
    filter: 'posts_no_replies',
    displayName: '@bsky.app',
    status: 'active',
    groupName: 'bluesky-bsky-app',
    importLimit: 20,
    moderationMode: 'autoImport',
    moderationRules: [
      {name: 'spam', type: 'keyword', field: 'text', action: 'block', value: 'spam'}
    ],
    mediaPolicy: {
      images: 'preserve',
      linkPreviews: 'ignore',
      unsupportedEmbeds: 'reject'
    },
    relationPolicy: {
      replies: 'preserve',
      quotes: 'omit',
      reposts: 'reject'
    },
    dbChannelId: 33,
    lastCursor: 'cursor-1',
    lastRefreshRequestedAt: '2026-06-03T09:00:00.000Z',
    lastImportedAt: '2026-06-03T09:00:00.000Z',
    lastError: null
  }
];
let blueskyFeedItems = [
  {
    id: 901,
    title: 'Native Bluesky launch',
    status: 'published',
    source: 'socNetImport:bluesky',
    sourceChannelId: 'did:plc:bsky',
    sourcePostId: 'at://did:plc:bsky/app.bsky.feed.post/abc',
    publishedAt: '2026-06-03T09:00:00.000Z',
    propertiesJson: {
      bluesky: {
        text: 'Native ATProto post imported into GeeSome.',
        url: 'https://bsky.app/profile/bsky.app/post/abc'
      }
    }
  }
];
let blueskyReviewItems = [
  {
    id: 951,
    userId: 7,
    sourceSubscriptionId: 801,
    actor: 'bsky.app',
    uri: 'at://did:plc:bsky/app.bsky.feed.post/review1',
    cid: 'bafy-review-1',
    sourceChannelId: 'did:plc:bsky',
    state: 'pending',
    moderationAction: 'review',
    moderationDecision: {reason: 'reviewFirst'},
    preview: {
      name: 'Review this Bluesky post',
      contentText: 'Review-first Bluesky post waiting for import.',
      url: 'https://bsky.app/profile/bsky.app/post/review1'
    },
    publishedAt: '2026-06-03T09:05:00.000Z',
    importedAt: null,
    reviewedAt: null,
    reviewedByUserId: null,
    lastError: null
  },
  {
    id: 952,
    userId: 7,
    sourceSubscriptionId: 801,
    actor: 'bsky.app',
    uri: 'at://did:plc:bsky/app.bsky.feed.post/review2',
    cid: 'bafy-review-2',
    sourceChannelId: 'did:plc:bsky',
    state: 'quarantined',
    moderationAction: 'quarantine',
    moderationDecision: {reason: 'keyword: giveaway spam'},
    preview: {
      name: 'Quarantined Bluesky post',
      contentText: 'Quarantined Bluesky post waiting for admin decision.',
      url: 'https://bsky.app/profile/bsky.app/post/review2'
    },
    publishedAt: '2026-06-03T09:10:00.000Z',
    importedAt: null,
    reviewedAt: null,
    reviewedByUserId: null,
    lastError: null
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
Vue.prototype.$asyncModal = {
  close(id) {
    calls.push({type: 'asyncModalClose', id});
  },
  open(options) {
    calls.push({type: 'asyncModalOpen', options});
  }
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
  async socNetDbAccountList(params) {
    calls.push({type: 'socNetDbAccountList', params});
    return {list: [blueskyCrossPostAccount]};
  },
  getEncryptedSocNetApiKey(apiKey) {
    calls.push({type: 'getEncryptedSocNetApiKey', apiKey});
    return `encrypted:${apiKey}`;
  },
  async userBlueskyLogin(input) {
    calls.push({type: 'userBlueskyLogin', input});
    return {
      account: {
        id: 42,
        userId: 7,
        socNet: 'bluesky',
        accountId: 'did:plc:newartist',
        username: 'newartist.bsky.social',
        fullName: 'New Artist',
        hasApiKey: true,
        isEncrypted: !!input.isEncrypted
      },
      profile: {
        did: 'did:plc:newartist',
        handle: 'newartist.bsky.social',
        displayName: 'New Artist'
      },
      did: 'did:plc:newartist',
      handle: 'newartist.bsky.social'
    };
  },
  async userBlueskyVerifyAccount(input) {
    calls.push({type: 'userBlueskyVerifyAccount', input});
    return {
      account: blueskyCrossPostAccount,
      profile: {
        did: blueskyCrossPostAccount.accountId,
        handle: blueskyCrossPostAccount.username,
        displayName: blueskyCrossPostAccount.fullName
      },
      did: blueskyCrossPostAccount.accountId,
      handle: blueskyCrossPostAccount.username
    };
  },
  async userBlueskyMigrationPreview(input) {
    calls.push({type: 'userBlueskyMigrationPreview', input});
    return socialMigrationBlueskyPreview;
  },
  async userBlueskyMigrationImport(input) {
    calls.push({type: 'userBlueskyMigrationImport', input});
    if (input && input.async) {
      return {id: 77, module: 'bluesky-migration-import', userApiKeyId: 12};
    }
    return {
      projectedPostsCount: 2,
      imported: 1,
      dbChannel: {id: 33, groupId: 31, title: '@bsky.app'}
    };
  },
  async userBlueskyMigrationReconcileRelations(input) {
    calls.push({type: 'userBlueskyMigrationReconcileRelations', input});
    return {
      checked: 4,
      updated: input && input.dryRun ? 1 : 2,
      skipped: 3,
      failed: 0,
      dryRun: !!(input && input.dryRun),
      rows: [
        {postId: 101, sourcePostId: 'at://did:plc:bsky/app.bsky.feed.post/root', changes: {replyToId: 100}},
        {postId: 102, sourcePostId: 'at://did:plc:bsky/app.bsky.feed.post/missing', reason: 'bluesky_migration_relation_target_missing'},
        {postId: 103, sourcePostId: 'at://did:plc:bsky/app.bsky.feed.post/ambiguous', reason: 'bluesky_migration_relation_target_ambiguous'},
        {postId: 104, sourcePostId: 'at://did:plc:bsky/app.bsky.feed.post/blocked', reason: 'bluesky_migration_reply_not_permitted'}
      ],
      errors: [],
      nextCursor: {publishedAt: '2026-07-04T08:00:00.000Z', id: 104}
    };
  },
  async userActivityPubMigrationPreview(input) {
    calls.push({type: 'userActivityPubMigrationPreview', input});
    if (!input || !input.ownershipProofToken) {
      return {
        ...socialMigrationActivityPubPreview,
        ownership: {
          claimed: true,
          verified: false,
          method: null,
          actor: socialMigrationActivityPubPreview.actor,
          reason: 'Ownership proof is required before import'
        }
      };
    }
    return socialMigrationActivityPubPreview;
  },
  async userActivityPubMigrationImport(input) {
    calls.push({type: 'userActivityPubMigrationImport', input});
    if (input && input.async) {
      return {id: 78, module: 'activitypub-migration-import', userApiKeyId: 12};
    }
    return {
      cached: 2,
      created: 1,
      skipped: 1,
      postIds: [88],
      remoteObjectIds: [501, 502]
    };
  },
  async userActivityPubMigrationReconcileRelations(input) {
    calls.push({type: 'userActivityPubMigrationReconcileRelations', input});
    return {
      checked: 2,
      updated: 1,
      skipped: 1,
      failed: 0,
      dryRun: !!(input && input.dryRun),
      rows: [
        {postId: 201, sourcePostId: 'remoteObject:501', changes: {replyToId: 200}},
        {postId: 202, sourcePostId: 'remoteObject:502', reason: 'activitypub_migration_relation_target_missing'},
        {postId: 203, sourcePostId: 'remoteObject:503', reason: 'activitypub_migration_reply_already_set'}
      ],
      errors: []
    };
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
  async getCanCreatePost(groupId) {
    calls.push({type: 'getCanCreatePost', groupId});
    return true;
  },
  async createPost(postData) {
    calls.push({type: 'createPost', postData});
    return {
      id: 701,
      localId: 701,
      groupId: postData.groupId,
      status: postData.status,
      contents: postData.contents || []
    };
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
  },
  async adminGetBlueskySourceSubscriptions(filters) {
    calls.push({type: 'adminGetBlueskySourceSubscriptions', filters});
    const list = blueskySources.filter((source) => source.status !== 'removed');
    return {list, total: list.length};
  },
  async adminSubscribeBlueskySource(input) {
    calls.push({type: 'adminSubscribeBlueskySource', input});
    const actor = input && input.actor || 'bsky.app';
    const existingSource = blueskySources.find((item) => item.actor === actor);
    if (existingSource) {
      existingSource.displayName = input && input.displayName || existingSource.displayName;
      existingSource.filter = input && input.filter || existingSource.filter;
      existingSource.groupName = input && input.groupName || existingSource.groupName;
      existingSource.importLimit = input && input.importLimit || existingSource.importLimit;
      existingSource.moderationMode = input && input.moderationMode || existingSource.moderationMode;
      existingSource.moderationRules = input && input.moderationRules || existingSource.moderationRules;
      existingSource.mediaPolicy = input && input.mediaPolicy || existingSource.mediaPolicy;
      existingSource.relationPolicy = input && input.relationPolicy || existingSource.relationPolicy;
      existingSource.status = 'active';
      return existingSource;
    }

    const source = {
      id: 802,
      userId: 7,
      actor,
      filter: input && input.filter || 'posts_no_replies',
      displayName: input && input.displayName || actor,
      status: 'active',
      groupName: input && input.groupName || '',
      importLimit: input && input.importLimit || 20,
      moderationMode: input && input.moderationMode || 'autoImport',
      moderationRules: input && input.moderationRules || [],
      mediaPolicy: input && input.mediaPolicy || {},
      relationPolicy: input && input.relationPolicy || {},
      dbChannelId: null,
      lastCursor: null,
      lastRefreshRequestedAt: null,
      lastImportedAt: null,
      lastError: null
    };
    blueskySources = blueskySources.concat([source]);
    return source;
  },
  async adminUpdateBlueskySourceSubscription(sourceId, input) {
    calls.push({type: 'adminUpdateBlueskySourceSubscription', sourceId, input});
    const source = blueskySources.find((item) => Number(item.id) === Number(sourceId));
    if (source && input && input.status) {
      source.status = input.status;
    }
    if (source && input && input.filter !== undefined) {
      source.filter = input.filter;
    }
    if (source && input && input.displayName !== undefined) {
      source.displayName = input.displayName;
    }
    if (source && input && input.groupName !== undefined) {
      source.groupName = input.groupName;
    }
    if (source && input && input.importLimit !== undefined) {
      source.importLimit = input.importLimit;
    }
    if (source && input && input.moderationMode !== undefined) {
      source.moderationMode = input.moderationMode;
    }
    if (source && input && input.moderationRules !== undefined) {
      source.moderationRules = input.moderationRules;
    }
    if (source && input && input.mediaPolicy !== undefined) {
      source.mediaPolicy = input.mediaPolicy;
    }
    if (source && input && input.relationPolicy !== undefined) {
      source.relationPolicy = input.relationPolicy;
    }
    return source;
  },
  async adminRemoveBlueskySourceSubscription(sourceId) {
    calls.push({type: 'adminRemoveBlueskySourceSubscription', sourceId});
    const source = blueskySources.find((item) => Number(item.id) === Number(sourceId));
    if (source) {
      source.status = 'removed';
    }
    return {success: true};
  },
  async adminGetBlueskySourceFeed(sourceId, filters) {
    calls.push({type: 'adminGetBlueskySourceFeed', sourceId, filters});
    const source = blueskySources.find((item) => Number(item.id) === Number(sourceId)) || blueskySources[0];
    return {
      source,
      dbChannel: {
        id: 33,
        groupId: 31,
        channelId: 'did:plc:bsky',
        title: '@bsky.app',
        socNet: 'bluesky'
      },
      posts: {
        list: blueskyFeedItems,
        total: blueskyFeedItems.length
      }
    };
  },
  async adminGetBlueskySourceReviews(sourceId, filters) {
    calls.push({type: 'adminGetBlueskySourceReviews', sourceId, filters});
    const source = blueskySources.find((item) => Number(item.id) === Number(sourceId)) || blueskySources[0];
    let list = blueskyReviewItems.filter((item) => Number(item.sourceSubscriptionId) === Number(sourceId));
    if (filters && filters.state) {
      list = list.filter((item) => item.state === filters.state);
    } else {
      list = list.filter((item) => item.state !== 'imported' && item.state !== 'rejected');
    }
    return {
      source,
      list,
      total: list.length
    };
  },
  async adminUpdateBlueskySourceReviewState(sourceId, reviewId, input) {
    calls.push({type: 'adminUpdateBlueskySourceReviewState', sourceId, reviewId, input});
    const review = blueskyReviewItems.find((item) => Number(item.id) === Number(reviewId));
    if (review && input && input.state) {
      review.state = input.state;
      review.reviewedAt = input.state === 'pending' ? null : '2026-06-03T09:20:00.000Z';
      review.reviewedByUserId = input.state === 'pending' ? null : 7;
    }
    return review;
  },
  async adminImportBlueskySourceReview(sourceId, reviewId, input) {
    calls.push({type: 'adminImportBlueskySourceReview', sourceId, reviewId, input});
    const source = blueskySources.find((item) => Number(item.id) === Number(sourceId)) || blueskySources[0];
    const review = blueskyReviewItems.find((item) => Number(item.id) === Number(reviewId));
    if (review) {
      review.state = 'imported';
      review.importedAt = '2026-06-03T09:25:00.000Z';
      review.reviewedAt = '2026-06-03T09:25:00.000Z';
      review.reviewedByUserId = 7;
      if (!blueskyFeedItems.find((item) => item.sourcePostId === review.uri)) {
        blueskyFeedItems = blueskyFeedItems.concat([{
          id: 902,
          title: review.preview && review.preview.name,
          status: 'published',
          source: 'socNetImport:bluesky',
          sourceChannelId: review.sourceChannelId,
          sourcePostId: review.uri,
          publishedAt: review.publishedAt,
          propertiesJson: {
            bluesky: {
              text: 'Imported from review queue.',
              url: review.preview && review.preview.url
            }
          }
        }]);
      }
    }
    return {
      source,
      review,
      dbChannel: {id: 33, groupId: 31, channelId: 'did:plc:bsky', title: '@bsky.app', socNet: 'bluesky'},
      imported: review ? 1 : 0
    };
  },
  async adminRefreshBlueskySourceSubscription(sourceId, input) {
    calls.push({type: 'adminRefreshBlueskySourceSubscription', sourceId, input});
    const source = blueskySources.find((item) => Number(item.id) === Number(sourceId));
    if (source) {
      source.dbChannelId = 33;
      source.lastRefreshRequestedAt = '2026-06-03T09:30:00.000Z';
      source.lastImportedAt = '2026-06-03T09:30:00.000Z';
      source.lastCursor = 'cursor-2';
      source.lastError = null;
    }
    return {
      source,
      actor: source && source.actor,
      cursor: 'cursor-2',
      fetched: 2,
      imported: 1,
      moderation: {accepted: 1, blocked: 1},
      dbChannel: {id: 33, groupId: 31, channelId: 'did:plc:bsky', title: '@bsky.app', socNet: 'bluesky'}
    };
  },
  async adminSyncBlueskySourcePosts(sourceId, input) {
    calls.push({type: 'adminSyncBlueskySourcePosts', sourceId, input});
    const source = blueskySources.find((item) => Number(item.id) === Number(sourceId));
    return {
      source,
      checked: 1,
      updated: 1,
      deleted: 0,
      skipped: 0,
      failed: 0,
      errors: []
    };
  },
  async userBlueskyCrossPost(postId, input) {
    calls.push({type: 'userBlueskyCrossPost', postId, input});
    return {
      account: blueskyCrossPostAccount,
      did: blueskyCrossPostAccount.accountId,
      handle: blueskyCrossPostAccount.username,
      post: {id: postId, groupId: postFixtureGroup.staticId, status: 'published'},
      record: {
        uri: 'at://did:plc:artist/app.bsky.feed.post/abc',
        cid: 'bafy-cross-post'
      },
      alreadyExists: false
    };
  },
  async userBlueskyUpdateCrossPost(postId, input) {
    calls.push({type: 'userBlueskyUpdateCrossPost', postId, input});
    return {
      account: blueskyCrossPostAccount,
      did: blueskyCrossPostAccount.accountId,
      handle: blueskyCrossPostAccount.username,
      post: {id: postId, groupId: postFixtureGroup.staticId, status: 'published'},
      record: {
        uri: 'at://did:plc:artist/app.bsky.feed.post/abc',
        cid: 'bafy-cross-post-updated'
      },
      previousRecord: {
        uri: 'at://did:plc:artist/app.bsky.feed.post/abc',
        cid: 'bafy-cross-post'
      },
      updated: true
    };
  },
  async userBlueskyDeleteCrossPost(postId, input) {
    calls.push({type: 'userBlueskyDeleteCrossPost', postId, input});
    return {
      account: blueskyCrossPostAccount,
      did: blueskyCrossPostAccount.accountId,
      handle: blueskyCrossPostAccount.username,
      post: {id: postId, groupId: postFixtureGroup.staticId, status: 'published'},
      record: {
        uri: 'at://did:plc:artist/app.bsky.feed.post/abc',
        cid: 'bafy-cross-post-updated'
      },
      deleteRecord: {
        deleted: true,
        alreadyDeleted: false
      }
    };
  }
};

(window as any).__PIN_SERVICES_E2E__ = {calls};
(window as any).__STORAGE_SPACE_E2E__ = {calls};
(window as any).__POST_HTML_SAFETY_E2E__ = {calls};
(window as any).__NEW_POST_RICH_TEXT_E2E__ = {calls};
(window as any).__ACTIVITYPUB_REVIEW_E2E__ = {calls, activityPubRemoteObjects};
(window as any).__ACTIVITYPUB_SOURCES_E2E__ = {calls, activityPubSources, activityPubSourceFeedItems};
(window as any).__BLUESKY_SOURCES_E2E__ = {calls, blueskySources, blueskyFeedItems, blueskyReviewItems};
(window as any).__BLUESKY_POST_ACTIONS_E2E__ = {calls, blueskyCrossPostAccount, blueskyPostFixture};
(window as any).__BLUESKY_ACCOUNT_E2E__ = {calls, blueskyCrossPostAccount};
(window as any).__SOCIAL_MIGRATION_E2E__ = {calls, socialMigrationBlueskyPreview, socialMigrationActivityPubPreview};

new Vue({
  el: '#app',
  components: {PinServices, PostItem, NewPostControl, StorageSpacePage, ActivityPubRemoteObjectsPage, ActivityPubSourcesPage, BlueskySourcesPage, SocialMigrationPage, AddSocNetClientModal},
  data() {
    return {
      currentPage: getCurrentPage(),
      postFixture,
      blueskyPostFixture,
      blueskyCrossPostAccount,
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
      <section v-else-if="currentPage === 'bluesky-post-actions'" aria-label="Bluesky post actions fixture">
        <h1>Bluesky post actions</h1>
        <post-item :value="blueskyPostFixture" :group="postFixtureGroup" :show-bluesky-controls="true" />
      </section>
      <section v-else-if="currentPage === 'bluesky-account-connect'" aria-label="Bluesky account connect fixture">
        <h1>Bluesky account connect</h1>
        <add-soc-net-client-modal key="bluesky-account-connect" initial-soc-net="bluesky" />
      </section>
      <section v-else-if="currentPage === 'bluesky-account-verify'" aria-label="Bluesky account verify fixture">
        <h1>Bluesky account verify</h1>
        <add-soc-net-client-modal key="bluesky-account-verify" :account="blueskyCrossPostAccount" />
      </section>
      <section v-else-if="currentPage === 'new-post-rich-text'" aria-label="New post rich text fixture">
        <h1>New post rich text</h1>
        <new-post-control :group="postFixtureGroup" />
      </section>
      <storage-space-page v-else-if="currentPage === 'storage-space'" />
      <activity-pub-sources-page v-else-if="currentPage === 'activitypub-sources'" />
      <bluesky-sources-page v-else-if="currentPage === 'bluesky-sources'" />
      <social-migration-page v-else-if="currentPage === 'social-migration'" />
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
  if (window.location.hash === '#bluesky-post-actions') {
    return 'bluesky-post-actions';
  }
  if (window.location.hash === '#bluesky-account-connect') {
    return 'bluesky-account-connect';
  }
  if (window.location.hash === '#bluesky-account-verify') {
    return 'bluesky-account-verify';
  }
  if (window.location.hash === '#new-post-rich-text') {
    return 'new-post-rich-text';
  }
  if (window.location.hash === '#activitypub') {
    return 'activitypub';
  }
  if (window.location.hash === '#activitypub-sources') {
    return 'activitypub-sources';
  }
  if (window.location.hash === '#bluesky-sources') {
    return 'bluesky-sources';
  }
  if (window.location.hash === '#social-migration') {
    return 'social-migration';
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
