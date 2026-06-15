<script setup>
import { Bell, CheckCheck } from "@lucide/vue";
import { formatTime } from "../utils/display";

defineProps({
  notifications: { type: Array, default: () => [] }
});

defineEmits(["mark-read"]);

function labelOf(type) {
  const labels = {
    friend_request: "好友申请",
    friend_accepted: "好友通过",
    friend_rejected: "好友拒绝",
    group_invited: "入群邀请",
    group_updated: "群聊更新",
    group_muted: "群聊禁言",
    group_unmuted: "解除禁言",
    group_admin_set: "管理员变更",
    group_admin_unset: "管理员变更",
    group_owner_transfer: "群主转让",
    group_removed: "群聊成员"
  };
  return labels[type] || "系统通知";
}
</script>

<template>
  <section class="surface-page notification-page">
    <header class="page-header">
      <div class="avatar large">通</div>
      <div>
        <h2>通知中心</h2>
        <p>好友申请、入群邀请、管理员变更和禁言通知都会汇总在这里。</p>
      </div>
      <button class="mark-read-btn" type="button" @click="$emit('mark-read')">
        <CheckCheck />全部已读
      </button>
    </header>

    <div class="notification-list">
      <article
        v-for="item in notifications"
        :key="item.id"
        class="notification-item"
        :class="{ unread: !item.read }"
      >
        <div class="notification-icon"><Bell /></div>
        <div>
          <div class="notification-title">
            <strong>{{ labelOf(item.type) }}</strong>
            <time>{{ formatTime(item.createdAt) }}</time>
          </div>
          <p>{{ item.content }}</p>
        </div>
      </article>

      <div v-if="!notifications.length" class="empty-sidebar notification-empty">
        <Bell />
        <strong>暂无通知</strong>
        <span>新的好友申请、群聊事件和系统消息会出现在这里。</span>
      </div>
    </div>
  </section>
</template>
