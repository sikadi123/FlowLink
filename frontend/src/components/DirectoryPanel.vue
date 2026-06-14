<script setup>
import { MessageCircleMore, UsersRound } from "@lucide/vue";
import { avatarText, entitySubtitle, entityTitle } from "../utils/display";

defineProps({
  contacts: { type: Array, default: () => [] },
  groups: { type: Array, default: () => [] }
});

defineEmits(["select"]);
</script>

<template>
  <section class="surface-page directory-page">
    <header class="page-header">
      <div class="avatar large">通</div>
      <div>
        <h2>通讯录</h2>
        <p>群聊和联系人集中管理，点击任意卡片可进入对应会话。</p>
      </div>
    </header>

    <div class="directory-grid">
      <section>
        <div class="section-title"><UsersRound /><strong>群聊</strong><span>{{ groups.length }}</span></div>
        <article v-for="group in groups" :key="group.id" class="directory-card" @click="$emit('select', 'group', group.id)">
          <div class="avatar group">{{ avatarText(group) }}</div>
          <div><strong>{{ entityTitle(group) }}</strong><span>{{ entitySubtitle(group) }}</span></div>
          <MessageCircleMore />
        </article>
      </section>

      <section>
        <div class="section-title"><UsersRound /><strong>联系人</strong><span>{{ contacts.length }}</span></div>
        <article v-for="contact in contacts" :key="contact.id" class="directory-card" @click="$emit('select', 'private', contact.id)">
          <div class="avatar">{{ avatarText(contact) }}</div>
          <div><strong>{{ entityTitle(contact) }}</strong><span>{{ entitySubtitle(contact) }}</span></div>
          <MessageCircleMore />
        </article>
      </section>
    </div>
  </section>
</template>
