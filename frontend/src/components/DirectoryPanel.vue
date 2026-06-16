<script setup>
import { computed, reactive, ref } from "vue";
import { Check, MessageCircleMore, Search, UserPlus, UsersRound, X } from "@lucide/vue";
import { avatarText, entitySubtitle, entityTitle } from "../utils/display";

const props = defineProps({
  contacts: { type: Array, default: () => [] },
  groups: { type: Array, default: () => [] },
  requests: { type: Array, default: () => [] },
  searchResults: { type: Array, default: () => [] },
  currentUserId: { type: Number, default: null }
});

const emit = defineEmits(["select", "search-users", "request-friend", "respond-request", "create-group"]);
const keyword = ref("");
const friendMessage = ref("你好，希望添加你为好友");
const groupForm = reactive({ name: "", notice: "", memberIds: [] });

const pendingRequests = computed(() =>
  props.requests.filter((item) => Number(item.status) === 0 && Number(item.receiverId) === Number(props.currentUserId))
);

const sentRequests = computed(() =>
  props.requests.filter((item) => Number(item.status) === 0 && Number(item.senderId) === Number(props.currentUserId))
);

const groupMembers = computed(() => props.contacts.filter((item) => groupForm.memberIds.includes(item.id)));

function requestName(request) {
  return request.senderName || request.senderDisplayName || request.senderUsername || `用户 ${request.senderId}`;
}

function toggleMember(id) {
  groupForm.memberIds = groupForm.memberIds.includes(id)
    ? groupForm.memberIds.filter((item) => item !== id)
    : [...groupForm.memberIds, id];
}

function createGroup() {
  if (!groupForm.name.trim()) return;
  emit("create-group", {
    name: groupForm.name.trim(),
    notice: groupForm.notice.trim(),
    memberIds: groupForm.memberIds
  });
  groupForm.name = "";
  groupForm.notice = "";
  groupForm.memberIds = [];
}
</script>

<template>
  <section class="surface-page directory-page">
    <header class="page-header">
      <div class="avatar large">录</div>
      <div>
        <h2>通讯录</h2>
        <p>管理联系人、好友申请和群聊，新的申请会优先显示在待处理区。</p>
      </div>
    </header>

    <div class="directory-workbench">
      <section class="directory-main">
        <section class="directory-request-board" :class="{ active: pendingRequests.length }">
          <div class="directory-request-heading">
            <div>
              <strong>好友申请待办</strong>
              <span v-if="pendingRequests.length">有 {{ pendingRequests.length }} 条申请需要处理</span>
              <span v-else>暂无待处理申请</span>
            </div>
            <em v-if="pendingRequests.length">{{ pendingRequests.length }}</em>
          </div>

          <div v-if="pendingRequests.length" class="request-card-grid">
            <article v-for="request in pendingRequests" :key="request.id" class="request-card">
              <div class="avatar">{{ requestName(request).slice(0, 1).toUpperCase() }}</div>
              <div class="request-card-copy">
                <strong>{{ requestName(request) }}</strong>
                <span>{{ request.message || "对方希望添加你为好友" }}</span>
              </div>
              <div class="request-card-actions">
                <button class="accept" type="button" @click="$emit('respond-request', request.id, 'accept')">
                  <Check />同意
                </button>
                <button class="reject" type="button" @click="$emit('respond-request', request.id, 'reject')">
                  <X />拒绝
                </button>
              </div>
            </article>
          </div>
          <p v-else class="muted-text">收到新的好友申请后，这里会显示申请人、留言和快捷操作。</p>
        </section>

        <div class="section-title"><UsersRound /><strong>群聊</strong><span>{{ groups.length }}</span></div>
        <article v-for="group in groups" :key="group.id" class="directory-card" @click="$emit('select', 'group', group.id)">
          <div class="avatar group">{{ avatarText(group) }}</div>
          <div><strong>{{ entityTitle(group) }}</strong><span>{{ entitySubtitle(group) }}</span></div>
          <MessageCircleMore />
        </article>

        <div class="section-title spaced"><UsersRound /><strong>联系人</strong><span>{{ contacts.length }}</span></div>
        <article v-for="contact in contacts" :key="contact.id" class="directory-card" @click="$emit('select', 'private', contact.id)">
          <div class="avatar">{{ avatarText(contact) }}</div>
          <div><strong>{{ entityTitle(contact) }}</strong><span>{{ entitySubtitle(contact) }}</span></div>
          <MessageCircleMore />
        </article>
      </section>

      <aside class="directory-tools">
        <section class="tool-panel">
          <h3>添加好友</h3>
          <label class="search-box compact">
            <Search />
            <input v-model="keyword" placeholder="搜索用户名或昵称" @input="$emit('search-users', keyword)" />
          </label>
          <textarea v-model="friendMessage" placeholder="申请说明"></textarea>
          <div class="result-list">
            <article v-for="user in searchResults" :key="user.id" class="mini-user">
              <div class="avatar">{{ avatarText(user) }}</div>
              <div><strong>{{ entityTitle(user) }}</strong><span>{{ user.department || user.username }}</span></div>
              <button v-if="!user.isFriend && !user.requestPending" type="button" @click="$emit('request-friend', user.id, friendMessage)">
                <UserPlus />添加
              </button>
              <small v-else>{{ user.isFriend ? "已是好友" : "等待处理" }}</small>
            </article>
          </div>
        </section>

        <section class="tool-panel">
          <h3>申请状态</h3>
          <article v-for="request in pendingRequests" :key="request.id" class="request-row">
            <div>
              <strong>{{ requestName(request) }}</strong>
              <span>{{ request.message || "请求添加你为好友" }}</span>
            </div>
            <button title="通过" type="button" @click="$emit('respond-request', request.id, 'accept')"><Check /></button>
            <button title="拒绝" type="button" @click="$emit('respond-request', request.id, 'reject')"><X /></button>
          </article>
          <p v-if="!pendingRequests.length" class="muted-text">暂无待处理申请</p>
          <p v-if="sentRequests.length" class="muted-text">你发出的 {{ sentRequests.length }} 条申请正在等待对方处理。</p>
        </section>

        <section class="tool-panel">
          <h3>创建群聊</h3>
          <input v-model="groupForm.name" placeholder="群聊名称" />
          <input v-model="groupForm.notice" placeholder="群公告，可选" />
          <div class="member-picker">
            <button
              v-for="contact in contacts"
              :key="contact.id"
              type="button"
              :class="{ active: groupForm.memberIds.includes(contact.id) }"
              @click="toggleMember(contact.id)"
            >
              {{ entityTitle(contact) }}
            </button>
          </div>
          <p class="muted-text">已选择 {{ groupMembers.length }} 位联系人</p>
          <button class="primary-action" type="button" @click="createGroup">创建群聊</button>
        </section>
      </aside>
    </div>
  </section>
</template>
