<script setup>
import { Bell, CheckCheck, Trash2 } from "@lucide/vue";
import { formatTime } from "../utils/display";

defineProps({
  notifications: { type: Array, default: () => [] }
});

defineEmits(["mark-read", "delete-one", "delete-all"]);

function labelOf(type) {
  const labels = {
    friend_request: "好友申请",
    friend_accepted: "好友通过",
    friend_rejected: "好友拒绝",
    group_invited: "入群邀请",
    group_updated: "群聊更新",
    group_muted: "禁言通知",
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
    <header class="page-header notification-header">
      <div class="avatar large">通</div>
      <div class="notification-header-text">
        <h2>通知中心</h2>
        <p>好友申请、入群邀请、管理员变更和禁言通知都会汇总在这里。</p>
      </div>
      <div class="notification-header-actions">
        <button class="mark-read-btn" type="button" @click="$emit('mark-read')">
          <CheckCheck />全部已读
        </button>
        <button class="delete-all-btn" type="button" :disabled="!notifications.length" @click="$emit('delete-all')">
          <Trash2 />清空通知
        </button>
      </div>
    </header>

    <div class="notification-list">
      <article
        v-for="item in notifications"
        :key="item.id"
        class="notification-item"
        :class="{ 'notification-item-unread': !item.read }"
      >
        <div class="notification-icon"><Bell /></div>
        <div class="notification-body">
          <div class="notification-title">
            <strong>{{ labelOf(item.type) }}</strong>
            <time>{{ formatTime(item.createdAt) }}</time>
          </div>
          <p>{{ item.content }}</p>
        </div>
        <button class="notification-delete" type="button" title="删除通知" @click="$emit('delete-one', item.id)">
          <Trash2 />
        </button>
      </article>

      <div v-if="!notifications.length" class="empty-sidebar notification-empty">
        <Bell />
        <strong>暂无通知</strong>
        <span>新的好友申请、群聊事件和系统消息会出现在这里。</span>
      </div>
    </div>
  </section>
</template>
