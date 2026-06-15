<script setup>
import { computed, ref } from "vue";
import { MoreHorizontal, Pin, PinOff, Plus, Search, Trash2, UserPlus, UsersRound } from "@lucide/vue";
import { avatarImage, avatarStyle, avatarText, conversationTime, entitySubtitle, entityTitle, previewText } from "../utils/display";

const props = defineProps({
  activeTab: { type: String, required: true },
  selected: { type: Object, default: null },
  contacts: { type: Array, default: () => [] },
  groups: { type: Array, default: () => [] },
  conversations: { type: Array, default: () => [] },
  pinnedConversations: { type: Array, default: () => [] }
});

const emit = defineEmits(["select", "openProfile", "create", "togglePin", "hideConversation"]);

const keyword = ref("");
const listMode = ref("all");
const menu = ref(null);

const isContactsMode = computed(() => props.activeTab !== "chats");

const title = computed(() => {
  if (props.activeTab === "contacts") return "通讯录";
  if (props.activeTab === "settings") return "个人中心";
  if (props.activeTab === "notifications") return "通知中心";
  return "消息";
});

const subtitle = computed(() => {
  if (isContactsMode.value) return `${props.groups.length} 个群聊 · ${props.contacts.length} 位联系人`;
  const unread = props.conversations.reduce((sum, item) => sum + Number(item.unread || 0), 0);
  return unread ? `${unread} 条未读消息` : "所有会话已处理";
});

const conversationItems = computed(() => {
  const text = keyword.value.trim().toLowerCase();
  return props.conversations.filter((item) => !text || entityTitle(item).toLowerCase().includes(text));
});

const directoryGroups = computed(() => filterItems(props.groups));
const directoryContacts = computed(() => filterItems(props.contacts));

function filterItems(items) {
  const text = keyword.value.trim().toLowerCase();
  return items.filter((item) => !text || entityTitle(item).toLowerCase().includes(text));
}

function typeOf(item) {
  return item.conversationType || (item.ownerId ? "group" : "private");
}

function keyOf(item) {
  return `${typeOf(item)}:${item.id}`;
}

function isPinned(item) {
  return props.pinnedConversations.includes(keyOf(item));
}

function openMenu(event, item) {
  if (isContactsMode.value) return;
  event.preventDefault();
  menu.value = { item, x: event.clientX, y: event.clientY };
}

function closeMenu() {
  menu.value = null;
}

function togglePin() {
  if (!menu.value) return;
  emit("togglePin", typeOf(menu.value.item), menu.value.item.id);
  closeMenu();
}

function hideConversation() {
  if (!menu.value) return;
  emit("hideConversation", typeOf(menu.value.item), menu.value.item.id);
  closeMenu();
}
</script>

<template>
  <aside class="sidebar" @click="closeMenu">
    <header class="sidebar-header">
      <div>
        <h2>{{ title }}</h2>
        <p>{{ subtitle }}</p>
      </div>
      <button class="icon-btn strong" type="button" title="新建会话" @click.stop="$emit('create')"><Plus /></button>
    </header>

    <label class="search-box">
      <Search />
      <input v-model="keyword" :placeholder="isContactsMode ? '搜索联系人或群聊' : '搜索会话'" />
    </label>

    <template v-if="!isContactsMode">
      <div class="conversation-summary">
        <span>置顶 {{ pinnedConversations.length }}</span>
        <span>会话 {{ conversationItems.length }}</span>
      </div>

      <div class="list conversation-list">
        <article
          v-for="item in conversationItems"
          :key="keyOf(item)"
          class="list-item conversation-item"
          :class="{ active: selected?.type === typeOf(item) && String(selected?.id) === String(item.id), pinned: isPinned(item) }"
          @click="$emit('select', typeOf(item), item.id)"
          @contextmenu="openMenu($event, item)"
        >
          <div class="avatar" :class="{ group: typeOf(item) === 'group' }" :style="avatarStyle(item)">
            <img v-if="avatarImage(item)" :src="avatarImage(item)" alt="头像" />
            <span v-else>{{ avatarText(item) }}</span>
          </div>
          <div class="list-copy">
            <div class="list-title-line">
              <strong>{{ entityTitle(item) }}</strong>
              <time>{{ conversationTime(item) }}</time>
            </div>
            <span>{{ previewText(item) }}</span>
          </div>
          <div class="list-meta">
            <Pin v-if="isPinned(item)" class="pin-mark" />
            <small v-if="item.unread" class="unread">{{ item.unread }}</small>
            <MoreHorizontal class="more-mark" />
          </div>
        </article>

        <div v-if="!conversationItems.length" class="empty-sidebar">
          <UserPlus />
          <strong>没有会话</strong>
          <span>点击右上角新建或从通讯录开始聊天</span>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="sidebar-tabs">
        <button :class="{ active: listMode === 'all' }" type="button" @click="listMode = 'all'">全部</button>
        <button :class="{ active: listMode === 'groups' }" type="button" @click="listMode = 'groups'">群聊</button>
        <button :class="{ active: listMode === 'contacts' }" type="button" @click="listMode = 'contacts'">联系人</button>
      </div>

      <div class="directory-sidebar-list">
        <section v-if="listMode !== 'contacts'" class="directory-sidebar-section">
          <div class="directory-sidebar-title"><UsersRound /><strong>群聊</strong><span>{{ directoryGroups.length }}</span></div>
          <article
            v-for="group in directoryGroups"
            :key="`group-${group.id}`"
            class="directory-sidebar-item"
            @click="$emit('select', 'group', group.id)"
          >
            <div class="avatar group" :style="avatarStyle(group)">
              <img v-if="avatarImage(group)" :src="avatarImage(group)" alt="头像" />
              <span v-else>{{ avatarText(group) }}</span>
            </div>
            <div><strong>{{ entityTitle(group) }}</strong><span>{{ entitySubtitle(group) }}</span></div>
          </article>
        </section>

        <section v-if="listMode !== 'groups'" class="directory-sidebar-section">
          <div class="directory-sidebar-title"><UserPlus /><strong>联系人</strong><span>{{ directoryContacts.length }}</span></div>
          <article
            v-for="contact in directoryContacts"
            :key="`private-${contact.id}`"
            class="directory-sidebar-item"
            @click="$emit('select', 'private', contact.id)"
          >
            <div class="avatar" :style="avatarStyle(contact)">
              <img v-if="avatarImage(contact)" :src="avatarImage(contact)" alt="头像" />
              <span v-else>{{ avatarText(contact) }}</span>
            </div>
            <div><strong>{{ entityTitle(contact) }}</strong><span>{{ contact.department || contact.statusMessage || contact.username }}</span></div>
          </article>
        </section>

        <div v-if="!directoryGroups.length && !directoryContacts.length" class="empty-sidebar">
          <UserPlus />
          <strong>没有匹配结果</strong>
          <span>换个关键词试试</span>
        </div>
      </div>
    </template>

    <div
      v-if="menu"
      class="context-menu"
      :style="{ left: `${menu.x}px`, top: `${menu.y}px` }"
      @click.stop
    >
      <button type="button" @click="togglePin">
        <component :is="isPinned(menu.item) ? PinOff : Pin" />
        {{ isPinned(menu.item) ? '取消置顶' : '置顶会话' }}
      </button>
      <button type="button" class="danger" @click="hideConversation">
        <Trash2 />删除会话
      </button>
    </div>
  </aside>
</template>
