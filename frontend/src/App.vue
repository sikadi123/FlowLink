<script setup>
import { onMounted, reactive, ref } from "vue";
import AppRail from "./components/AppRail.vue";
import AuthView from "./components/AuthView.vue";
import CallOverlay from "./components/CallOverlay.vue";
import ChatPanel from "./components/ChatPanel.vue";
import ConversationSidebar from "./components/ConversationSidebar.vue";
import DirectoryPanel from "./components/DirectoryPanel.vue";
import NotificationPanel from "./components/NotificationPanel.vue";
import ProfilePanel from "./components/ProfilePanel.vue";
import { resolveUrl } from "./api/http";
import { useChatStore } from "./stores/chatStore";

const store = useChatStore();
const profileForm = reactive({});
const userSearchResults = ref([]);


  onErrorCaptured((error, instance, info) => {
  console.error('应用发生错误:', error, instance, info)
  // 重置到安全状态
  store.activeTab = 'chats'
  store.selected = null
  store.toastText = '应用遇到了一个问题，已自动恢复'
  // 返回false表示错误已处理，不会向上传播
  return false
})

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

async function openContactsFromNotification() {
  await store.setTab("contacts");
}

async function respondNotificationRequest(requestId, action, notificationId) {
  await store.respondFriendRequest(requestId, action);
  if (notificationId) {
    await store.deleteNotification(notificationId);
  }
  await store.setTab("contacts");
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
      `tab-${store.activeTab}`,
      `theme-${store.theme}`,
      `chat-bg-${store.chatBackground}`
    ]"
    :style="store.chatBackground === 'custom' && store.chatWallpaperUrl ? { '--chat-wallpaper': `url('${resolveUrl(store.chatWallpaperUrl)}')` } : {}"
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
        :theme="store.theme"
        :chat-background="store.chatBackground"
        :chat-wallpaper-url="store.chatWallpaperUrl"
        :upload-chat-background="store.uploadChatBackground"
        @save="store.saveProfile"
        @change-theme="store.setTheme"
        @change-chat-background="store.setChatBackground"
        @change-chat-wallpaper="store.setChatWallpaperUrl"
        @logout="store.logout"
      />

      <NotificationPanel
        v-else-if="store.activeTab === 'notifications'"
        :notifications="store.notifications"
        :requests="store.requests"
        :current-user-id="store.me?.id"
        @mark-read="store.markNotificationsRead"
        @delete-one="store.deleteNotification"
        @delete-all="store.deleteAllNotifications"
        @open-contacts="openContactsFromNotification"
        @respond-request="respondNotificationRequest"
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
        @send-voice="store.uploadAndSendVoice"
        @recall-message="store.recallMessage"
        @delete-message="store.deleteMessage"
        @back="store.closeConversation"
        @load-earlier="store.loadEarlierMessages"
        @update-group="store.updateGroup"
        @update-my-group-nickname="store.updateMyGroupNickname"
        @invite-group-members="store.inviteGroupMembers"
        @remove-group-member="store.removeGroupMember"
        @set-group-admin="store.setGroupAdmin"
        @set-group-mute="store.setGroupMute"
        @transfer-group-owner="store.transferGroupOwner"
        @leave-group="store.leaveGroup"
        @dissolve-group="store.dissolveGroup"
        @delete-friend="store.deleteFriend"
        @block-friend="store.blockFriend"
        @start-video-call="store.startVideoCall"
      />
    </section>

    <CallOverlay
      :call="store.call"
      @accept="store.acceptCall"
      @reject="store.rejectCall"
      @hangup="store.hangupCall"
      @toggle-mic="store.toggleCallMic"
      @toggle-camera="store.toggleCallCamera"
    />
  </main>
</template>
