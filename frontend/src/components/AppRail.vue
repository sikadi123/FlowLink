<script setup>
import { LogOut, MessageCircle, UserRound, UsersRound } from "@lucide/vue";
import { avatarText } from "../utils/display";

defineProps({
  me: { type: Object, required: true },
  activeTab: { type: String, required: true },
  unreadCount: { type: Number, default: 0 },
  connectionStatus: { type: String, default: "offline" }
});

defineEmits(["changeTab", "openProfile", "logout"]);

const tabs = [
  { key: "chats", label: "消息", icon: MessageCircle },
  { key: "contacts", label: "通讯录", icon: UsersRound },
  { key: "settings", label: "我的", icon: UserRound }
];
</script>

<template>
  <aside class="rail">
    <div class="rail-brand">F</div>
    <div class="rail-status" :class="connectionStatus">
      <span></span>
      {{ connectionStatus === "online" ? "在线" : connectionStatus === "connecting" ? "连接中" : connectionStatus === "reconnecting" ? "重连中" : "离线" }}
    </div>

    <nav class="rail-nav" aria-label="主导航">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        :class="{ active: activeTab === tab.key }"
        type="button"
        @click="tab.key === 'settings' ? $emit('openProfile') : $emit('changeTab', tab.key)"
      >
        <component :is="tab.icon" />
        <span>{{ tab.label }}</span>
        <i v-if="tab.key === 'chats' && unreadCount" class="rail-badge">{{ unreadCount }}</i>
      </button>
    </nav>

    <div class="rail-user-box">
      <button class="rail-user" type="button" @click="$emit('openProfile')" title="个人资料">
        <span class="rail-avatar">{{ avatarText(me) }}</span>
        <small>{{ me.displayName }}</small>
      </button>
      <button class="rail-logout" type="button" title="退出登录" @click="$emit('logout')">
        <LogOut />
      </button>
    </div>
  </aside>
</template>
