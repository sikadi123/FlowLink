<script setup>
import { computed, ref } from "vue";
import { Plus, Search, UserPlus } from "@lucide/vue";
import { avatarText, conversationTime, entityTitle, previewText } from "../utils/display";

const props = defineProps({
  activeTab: { type: String, required: true },
  selected: { type: Object, default: null },
  contacts: { type: Array, default: () => [] },
  groups: { type: Array, default: () => [] }
});

defineEmits(["select", "openProfile"]);

const keyword = ref("");
const listMode = ref("all");

const title = computed(() => {
  if (props.activeTab === "contacts") return "通讯录";
  if (props.activeTab === "settings") return "个人中心";
  return "消息";
});

const items = computed(() => {
  const source = listMode.value === "all"
    ? [...props.groups, ...props.contacts]
    : listMode.value === "groups"
      ? props.groups
      : props.contacts;
  const text = keyword.value.trim().toLowerCase();
  return source.filter((item) => !text || entityTitle(item).toLowerCase().includes(text));
});

function typeOf(item) {
  return item.conversationType || (item.ownerId ? "group" : "private");
}
</script>

<template>
  <aside class="sidebar">
    <header class="sidebar-header">
      <div>
        <h2>{{ title }}</h2>
        <p>{{ groups.length }} 个群聊 · {{ contacts.length }} 位联系人</p>
      </div>
      <button class="icon-btn strong" type="button" title="新建"><Plus /></button>
    </header>

    <label class="search-box">
      <Search />
      <input v-model="keyword" placeholder="搜索联系人或群聊" />
    </label>

    <div class="sidebar-tabs">
      <button :class="{ active: listMode === 'all' }" type="button" @click="listMode = 'all'">全部</button>
      <button :class="{ active: listMode === 'groups' }" type="button" @click="listMode = 'groups'">群聊</button>
      <button :class="{ active: listMode === 'contacts' }" type="button" @click="listMode = 'contacts'">联系人</button>
    </div>

    <div class="list">
      <article
        v-for="item in items"
        :key="`${typeOf(item)}-${item.id}`"
        class="list-item"
        :class="{ active: selected?.type === typeOf(item) && String(selected?.id) === String(item.id) }"
        @click="$emit('select', typeOf(item), item.id)"
      >
        <div class="avatar" :class="{ group: typeOf(item) === 'group' }">{{ avatarText(item) }}</div>
        <div class="list-copy">
          <div class="list-title-line">
            <strong>{{ entityTitle(item) }}</strong>
            <time>{{ conversationTime(item) }}</time>
          </div>
          <span>{{ previewText(item) }}</span>
        </div>
        <div class="list-meta">
          <small class="type-pill" :class="{ group: typeOf(item) === 'group' }">{{ typeOf(item) === 'group' ? '群' : '私' }}</small>
          <small v-if="item.unread" class="unread">{{ item.unread }}</small>
        </div>
      </article>

      <div v-if="!items.length" class="empty-sidebar">
        <UserPlus />
        <strong>没有匹配结果</strong>
        <span>换个关键词试试</span>
      </div>
    </div>
  </aside>
</template>
