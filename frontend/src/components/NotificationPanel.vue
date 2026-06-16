<script setup>
import { computed } from "vue";
import { Bell, Check, CheckCheck, ExternalLink, Trash2, UserPlus, X } from "@lucide/vue";
import { formatTime } from "../utils/display";

const props = defineProps({
  notifications: { type: Array, default: () => [] },
  requests: { type: Array, default: () => [] },
  currentUserId: { type: Number, default: null }
});

const emit = defineEmits(["mark-read", "delete-one", "delete-all", "open-contacts", "respond-request"]);

const pendingRequests = computed(() =>
  props.requests.filter((item) => Number(item.status) === 0 && Number(item.receiverId) === Number(props.currentUserId))
);

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

function requestName(request) {
  return request.senderName || request.senderDisplayName || request.senderUsername || `用户 ${request.senderId}`;
}

function requestSubtitle(request) {
  return request.message || "对方希望添加你为好友";
}

function relatedRequests(notification) {
  if (notification.type !== "friend_request") return [];
  if (pendingRequests.value.length <= 1) return pendingRequests.value;

  const content = `${notification.content || ""}`.toLowerCase();
  const matched = pendingRequests.value.filter((request) => {
    const name = `${requestName(request)}`.toLowerCase();
    return content.includes(name) || content.includes(String(request.senderId));
  });
  return matched.length ? matched : pendingRequests.value.slice(0, 3);
}

function openContacts() {
  emit("open-contacts");
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
        :class="{ 'notification-item-unread': !item.read, actionable: item.type === 'friend_request' }"
        @click="item.type === 'friend_request' && openContacts()"
      >
        <div class="notification-icon" :class="{ request: item.type === 'friend_request' }">
          <UserPlus v-if="item.type === 'friend_request'" />
          <Bell v-else />
        </div>
        <div class="notification-body">
          <div class="notification-title">
            <strong>{{ labelOf(item.type) }}</strong>
            <time>{{ formatTime(item.createdAt) }}</time>
          </div>
          <p>{{ item.content }}</p>

          <div v-if="item.type === 'friend_request'" class="notification-request-box" @click.stop>
            <div v-if="relatedRequests(item).length" class="notification-request-list">
              <article v-for="request in relatedRequests(item)" :key="request.id" class="notification-request-card">
                <div class="avatar small">{{ requestName(request).slice(0, 1).toUpperCase() }}</div>
                <div class="notification-request-copy">
                  <strong>{{ requestName(request) }}</strong>
                  <span>{{ requestSubtitle(request) }}</span>
                </div>
                <div class="notification-request-actions">
                  <button class="accept" type="button" title="同意" @click="$emit('respond-request', request.id, 'accept', item.id)">
                    <Check />
                  </button>
                  <button class="reject" type="button" title="拒绝" @click="$emit('respond-request', request.id, 'reject', item.id)">
                    <X />
                  </button>
                  <button class="ignore" type="button" title="忽略通知" @click="$emit('delete-one', item.id)">
                    忽略
                  </button>
                </div>
              </article>
            </div>
            <div v-else class="notification-request-done">
              这条申请已处理
              <button type="button" @click="$emit('delete-one', item.id)">移除</button>
            </div>
          </div>
        </div>
        <div class="notification-side-actions">
          <button
            v-if="item.type === 'friend_request'"
            class="notification-open"
            type="button"
            title="去通讯录处理"
            @click.stop="openContacts"
          >
            <ExternalLink />
          </button>
          <button class="notification-delete" type="button" title="删除通知" @click.stop="$emit('delete-one', item.id)">
            <Trash2 />
          </button>
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
