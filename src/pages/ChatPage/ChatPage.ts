/*
 * Copyright ©️ 2018-2020 Galt•Project Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka)
 *
 * Copyright ©️ 2018-2020 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) by
 * [Basic Agreement](ipfs/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS)).
 */

import GroupItem from "./GroupItem/GroupItem";
import AddFriendModal from "../../modals/AddFriendModal/AddFriendModal";
import {EventBus, UPDATE_GROUP} from "../../services/events";
import MessageItem from "./MessageItem/MessageItem";
import ContentManifestInfoItem from "../../directives/ContentManifestInfoItem/ContentManifestInfoItem";
import ChooseFileContentsIdsModal from "../../modals/ChooseFileContentsIdsModal/ChooseFileContentsIdsModal";
import ChatDeviceSecurity from "./ChatDeviceSecurity/ChatDeviceSecurity";
import EncryptedDirectChat from "./EncryptedDirectChat/EncryptedDirectChat";
import {
  getDirectConversationId,
  getOtherChatOwnerId
} from "../../services/encryptedChat";
const _ = require('lodash');

export default {
  name: 'chat-page',
  template: require('./ChatPage.template'),
  components: {
    GroupItem,
    MessageItem,
    ContentManifestInfoItem,
    ChatDeviceSecurity,
    EncryptedDirectChat
  },
  async created() {
    
  },
  async mounted() {
    await this.getGroups();
    if(this.selectedGroupId && !this.isEncryptedDirectChat) {
      await this.$geesome.exportPrivateKey();
      this.getGroupPosts(0);
    }
  },
  methods: {
    toggleSecurity() {
      this.securityOpen = !this.securityOpen;
    },
    async getGroups() {
      this.groups = await this.$geesome.getMemberInChats();

      this.groups.forEach((group) => {
        if (group.type === 'personal_chat') {
          return;
        } else {
          this.$geesome.subscribeToGroupUpdates(group.staticId, 'default', (event) => this.fetchGroupUpdate(group, event));
        }
      });
    },
    async fetchGroupUpdate(group, event) {
      console.log('fetchGroupUpdate', group, event);
      const post = await this.$geesome.getGroupPost(group.id, event.dataJson.postId);
      if(group.staticId === this.selectedGroupId) {
        this.messages.unshift(post);
      }
      
      this.$identities.loading('lastPost', group.id);
      this.$identities.set('lastPost', group.id, post);
      this.$identities.set('lastPostText', group.id, await this.$geesome.getContentData(post.contents[0]));
    },
    getGroupPosts(offset) {
      this.messagesLoading = true;
      
      if(offset === 0) {
        this.messages = [];
      }
      return this.$geesome.getGroupPostsAsync(this.selectedGroupId, {
        limit: this.messagesPagination.perPage,
        offset
        // offset: (this.messagesPagination.currentPage - 1) * this.messagesPagination.perPage
      }, (posts) => {
        this.appendMessages(posts);
      }, (posts) => {
        this.appendMessages(posts);
        this.messagesLoading = false;
      });
    },
    
    appendMessages(messages) {
      //TODO: more effective appendMessages
      this.messages = messages;
      
      this.messages.forEach(async message => {
        if(this.usersInfoLoading[message.authorStaticId] || this.usersInfo[message.authorStaticId]) {
          return;
        }
        this.$identities.loading('usersInfo', message.authorStaticId);
        this.$identities.set('usersInfo', message.authorStaticId, await this.$geesome.getUser(message.authorStaticId));
      });
    },
    addFriend() {
      this.$root.$asyncModal.open({
        id: 'add-friend-modal',
        component: AddFriendModal,
        onClose: () => {
          this.getGroups();
        }
      });
    },
    onEnter(event) {
      if(event.shiftKey) {
        return;
      }
      this.newMessage.text = _.trimEnd(this.newMessage.text, "\n");
      this.sendMessage();
    },
    async sendMessage() {
      let contentsIds = [];
      
      const text = this.newMessage.text;
      
      this.newMessage.text = '';
      
      const textContent = await this.$geesome.saveContentData(text, {
        groupId: this.selectedGroupId,
        mimeType: 'text/markdown'
      });

      contentsIds.push(textContent.id);

      contentsIds = contentsIds.concat(this.newMessage.contentsDbIds);

      this.newMessage.contentsDbIds = [];
      
      await this.$geesome.createPost({contents: contentsIds.map(id => ({id})), groupId: this.selectedGroupId, status: 'published'}).then(() => {
        this.saving = false;
        this.$emit('new-post');
        EventBus.$emit(UPDATE_GROUP, this.selectedGroupId);
      });

      // await this.getGroupPosts(0);
    },
    chooseAttachments() {
      this.$root.$asyncModal.open({
        id: 'choose-file-contents-ids-modal',
        component: ChooseFileContentsIdsModal,
        onClose: (selected) => {
          this.newMessage.contentsDbIds = selected;
        }
      });
    },
    getLocale(key, options?) {
      return this.$locale.get(this.localeKey + "." + key, options);
    }
  },
  watch: {
    selectedGroupId() {
      if (!this.isEncryptedDirectChat) {
        this.getGroupPosts(0);
      }
    }
  },
  computed: {
    selectedGroupId() {
      return this.$route.params.groupId;
    },
    currentGroup() {
      return _.find(this.groups, group =>
        group.staticId === this.selectedGroupId ||
        group.$manifestId === this.selectedGroupId
      );
    },
    user() {
      return this.$store.state.user;
    },
    chatOwnerId() {
      if (!this.user) {
        return '';
      }
      return this.user.storageAccountId ||
        this.user.manifestStaticStorageId ||
        '';
    },
    isEncryptedDirectChat() {
      return !!this.currentGroup && this.currentGroup.type === 'personal_chat';
    },
    recipientOwnerId() {
      if (!this.isEncryptedDirectChat) {
        return '';
      }
      return getOtherChatOwnerId(this.currentGroup.members, this.chatOwnerId);
    },
    secureConversationId() {
      if (!this.isEncryptedDirectChat || !this.recipientOwnerId) {
        return '';
      }
      try {
        return getDirectConversationId(this.currentGroup.members, this.currentGroup.theme || 'default');
      } catch (_error) {
        return '';
      }
    },
    usersInfo() {
      return this.$store.state.usersInfo;
    },
    usersInfoLoading() {
      return this.$store.state.usersInfoLoading;
    },
  },
  data() {
    return {
      localeKey: 'chat_page',
      loading: true,
      groups: [],
      messages: [],
      messagesLoading: false,
      securityOpen: false,
      messagesPagination: {
        currentPage: 1,
        perPage: 20
      },
      newMessage: {
        text: '',
        contentsDbIds: []
      }
    };
  }
}
