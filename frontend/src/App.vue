<script setup>
import { onMounted, reactive, ref } from "vue";
import AppRail from "./components/AppRail.vue";
import AuthView from "./components/AuthView.vue";
import ChatPanel from "./components/ChatPanel.vue";
import ConversationSidebar from "./components/ConversationSidebar.vue";
import DirectoryPanel from "./components/DirectoryPanel.vue";
import NotificationPanel from "./components/NotificationPanel.vue";
import ProfilePanel from "./components/ProfilePanel.vue";
import { useChatStore } from "./stores/chatStore";

const store = useChatStore();
const profileForm = reactive({});
const userSearchResults = ref([]);

onMounted(async () => {
  if (!store.token) return;
  await store.restoreSession();
  const initialTab = new URLSearchParams(window.location.search).get("tab");
  if (["chats", "contacts", "notifications", "settings"].includes(initialTab)) {
    if (initialTab === "settings") {
      openProfile();
    } else {
      await store.setTab(initialTab);
    }
  }
});

function openProfile() {
  store.setTab("settings");
  Object.assign(profileForm, store.me || {});
}

async function searchUsers(keyword) {
  userSearchResults.value = await store.searchUsers(keyword);
}
</script>

<template>
  <div class="toast" :class="{ show: store.toastText }">{{ store.toastText }}</div>

  <AuthView v-if="!store.me" />

  <main
    v-else
    class="workspace"
    :class="[
      { 'surface-mode': store.surfaceMode, 'has-selected': !!store.selected },
      `tab-${store.activeTab}`
    ]"
  >
    <AppRail
      :me="store.me"
      :active-tab="store.activeTab"
      :unread-count="store.totalUnread"
      :notification-unread="store.notificationUnread"
      :backend-status="store.backendStatus"
      :connection-status="store.connectionStatus"
      @change-tab="store.setTab"
      @open-profile="openProfile"
      @logout="store.logout"
    />

    <ConversationSidebar
      :active-tab="store.activeTab"
      :selected="store.selected"
      :contacts="store.contacts"
      :groups="store.groups"
      :conversations="store.conversations"
      :pinned-conversations="store.pinnedConversations"
      @select="store.selectConversation"
      @open-profile="openProfile"
      @create="store.setTab('contacts')"
      @toggle-pin="store.togglePinnedConversation"
      @hide-conversation="store.hideConversation"
    />

    <section class="main-panel">
      <ProfilePanel
        v-if="store.activeTab === 'settings'"
        :me="store.me"
        :form="profileForm"
        :upload-avatar="store.uploadAvatar"
        @save="store.saveProfile"
      />

      <NotificationPanel
        v-else-if="store.activeTab === 'notifications'"
        :notifications="store.notifications"
        @mark-read="store.markNotificationsRead"
        @delete-one="store.deleteNotification"
        @delete-all="store.deleteAllNotifications"
      />

      <DirectoryPanel
        v-else-if="store.activeTab !== 'chats'"
        :contacts="store.contacts"
        :groups="store.groups"
        :requests="store.requests"
        :search-results="userSearchResults"
        :current-user-id="store.me?.id"
        @select="store.selectConversation"
        @search-users="searchUsers"
        @request-friend="store.requestFriend"
        @respond-request="store.respondFriendRequest"
        @create-group="store.createGroup"
      />

      <ChatPanel
        v-else
        :me="store.me"
        :entity="store.currentEntity"
        :selected="store.selected"
        :messages="store.messages"
        :contacts="store.contacts"
        :name-of="store.nameOf"
        @send-text="store.sendText"
        @send-reply="store.sendReply"
        @send-file="store.uploadAndSend"
        @recall-message="store.recallMessage"
        @delete-message="store.deleteMessage"
        @back="store.closeConversation"
        @load-earlier="store.loadEarlierMessages"
        @update-group="store.updateGroup"
        @invite-group-members="store.inviteGroupMembers"
        @remove-group-member="store.removeGroupMember"
        @set-group-admin="store.setGroupAdmin"
        @set-group-mute="store.setGroupMute"
        @transfer-group-owner="store.transferGroupOwner"
        @leave-group="store.leaveGroup"
        @dissolve-group="store.dissolveGroup"
        @delete-friend="store.deleteFriend"
        @block-friend="store.blockFriend"
      />
    </section>

  </main>
</template>
