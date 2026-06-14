<script setup>
import { onMounted, reactive } from "vue";
import AppRail from "./components/AppRail.vue";
import AuthView from "./components/AuthView.vue";
import ChatPanel from "./components/ChatPanel.vue";
import ConversationSidebar from "./components/ConversationSidebar.vue";
import DirectoryPanel from "./components/DirectoryPanel.vue";
import ProfilePanel from "./components/ProfilePanel.vue";
import { useChatStore } from "./stores/chatStore";

const store = useChatStore();
const profileForm = reactive({});

onMounted(async () => {
  if (!store.token) return;
  await store.bootstrap();
  store.connectRealtime();
});

function openProfile() {
  store.setTab("settings");
  Object.assign(profileForm, store.me || {});
}
</script>

<template>
  <AuthView v-if="!store.me" />

  <main v-else class="workspace" :class="{ 'surface-mode': store.surfaceMode }">
    <AppRail
      :me="store.me"
      :active-tab="store.activeTab"
      :unread-count="store.totalUnread"
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
      @select="store.selectConversation"
      @open-profile="openProfile"
    />

    <section class="main-panel">
      <ProfilePanel
        v-if="store.activeTab === 'settings'"
        :me="store.me"
        :form="profileForm"
        @save="store.saveProfile"
      />

      <DirectoryPanel
        v-else-if="store.activeTab !== 'chats'"
        :contacts="store.contacts"
        :groups="store.groups"
        @select="store.selectConversation"
      />

      <ChatPanel
        v-else
        :me="store.me"
        :entity="store.currentEntity"
        :selected="store.selected"
        :messages="store.messages"
        @send-text="store.sendText"
        @send-file="store.uploadAndSend"
      />
    </section>

    <div class="toast" :class="{ show: store.toastText }">{{ store.toastText }}</div>
  </main>
</template>
