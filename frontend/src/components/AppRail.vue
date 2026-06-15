<script setup>
import { Bell, LogOut, MessageCircle, UserRound, UsersRound } from "@lucide/vue";
import { avatarImage, avatarStyle, avatarText } from "../utils/display";

defineProps({
  me: { type: Object, required: true },
  activeTab: { type: String, required: true },
  unreadCount: { type: Number, default: 0 },
  notificationUnread: { type: Number, default: 0 },
  backendStatus: { type: String, default: "unknown" },
  connectionStatus: { type: String, default: "offline" }
});

defineEmits(["changeTab", "openProfile", "logout"]);

const tabs = [
  { key: "chats", label: "消息", icon: MessageCircle },
  { key: "contacts", label: "通讯录", icon: UsersRound },
  { key: "notifications", label: "通知", icon: Bell },
  { key: "settings", label: "我的", icon: UserRound }
];
</script>

<template>
  <aside class="rail">
    <div class="rail-brand">F</div>
    <div class="rail-status" :class="connectionStatus">
      <span></span>
      {{
        backendStatus === "offline"
          ? "后端未连接"
          : backendStatus === "checking"
            ? "后端检查中"
            : connectionStatus === "online"
              ? "实时已连接"
              : connectionStatus === "connecting"
                ? "实时连接中"
                : connectionStatus === "reconnecting"
                  ? "实时重连中"
                  : connectionStatus === "error"
                    ? "实时异常"
                    : "后端已连接"
      }}
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
        <i v-if="tab.key === 'notifications' && notificationUnread" class="rail-badge">{{ notificationUnread }}</i>
      </button>
    </nav>

    <div class="rail-user-box">
      <button class="rail-user" type="button" @click="$emit('openProfile')" title="个人资料">
        <span class="rail-avatar" :style="avatarStyle(me)">
          <img v-if="avatarImage(me)" :src="avatarImage(me)" alt="头像" />
          <span v-else>{{ avatarText(me) }}</span>
        </span>
        <small>{{ me.displayName }}</small>
      </button>
      <button class="rail-logout" type="button" title="退出登录" @click="$emit('logout')">
        <LogOut />
      </button>
    </div>
  </aside>
</template>
