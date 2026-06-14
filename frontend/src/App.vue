<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { MessageCircle, Users, UserRound, Search, Plus, Send, Paperclip } from "lucide-vue-next";
import { useChatStore } from "./stores/chatStore";

const store = useChatStore();
const loginForm = reactive({ account: "linche", password: "flowlink123" });
const draft = ref("");
const profileForm = reactive({});

onMounted(async () => {
  if (store.token) {
    await store.bootstrap();
    store.connectRealtime();
  }
});

const listItems = computed(() => (store.activeTab === "contacts" ? [...store.groups, ...store.contacts] : store.conversations));

async function login() {
  await store.login(loginForm.account, loginForm.password);
}

async function send() {
  await store.sendText(draft.value);
  draft.value = "";
}

function openProfile() {
  store.setTab("settings");
  Object.assign(profileForm, store.me || {});
}

function avatarText(item) {
  return (item?.displayName || item?.name || item?.username || "F").slice(0, 1);
}
</script>

<template>
  <main v-if="!store.me" class="auth-view">
    <section class="auth-panel">
      <div class="brand-mark">F</div>
      <h1>FlowLink</h1>
      <p>即时通讯协作演示平台</p>
      <form @submit.prevent="login" class="auth-form">
        <input v-model="loginForm.account" placeholder="账号" />
        <input v-model="loginForm.password" placeholder="密码" type="password" />
        <button type="submit">登录</button>
      </form>
    </section>
  </main>

  <main v-else class="workspace" :class="{ 'surface-mode': store.surfaceMode }">
    <aside class="rail">
      <button :class="{ active: store.activeTab === 'chats' }" @click="store.setTab('chats')" title="消息"><MessageCircle /></button>
      <button :class="{ active: store.activeTab === 'contacts' }" @click="store.setTab('contacts')" title="联系人"><Users /></button>
      <button :class="{ active: store.activeTab === 'settings' }" @click="openProfile" title="我的"><UserRound /></button>
      <div class="rail-spacer"></div>
      <div class="rail-avatar">{{ avatarText(store.me) }}</div>
    </aside>

    <aside class="sidebar">
      <header class="sidebar-header">
        <h2>{{ store.activeTab === 'contacts' ? '通讯录' : store.activeTab === 'settings' ? '我的' : '消息' }}</h2>
        <button class="icon-btn"><Plus /></button>
      </header>
      <label class="search-box"><Search /><input placeholder="搜索" /></label>
      <div class="list">
        <article v-for="item in listItems" :key="`${item.conversationType || 'private'}-${item.id}`" class="list-item" @click="store.selectConversation(item.conversationType || 'private', item.id)">
          <div class="avatar">{{ avatarText(item) }}</div>
          <div>
            <strong>{{ item.name || item.displayName }}</strong>
            <span>{{ item.notice || item.statusMessage || item.username }}</span>
          </div>
        </article>
      </div>
    </aside>

    <section class="main-panel">
      <template v-if="store.activeTab === 'settings'">
        <header class="page-header">
          <div class="avatar large">{{ avatarText(store.me) }}</div>
          <div><h2>个人资料</h2><p>编辑你的展示信息、部门、状态和联系方式</p></div>
        </header>
        <form class="profile-grid" @submit.prevent="store.saveProfile(profileForm)">
          <input v-model="profileForm.displayName" placeholder="昵称" />
          <input v-model="profileForm.username" placeholder="用户名" />
          <input v-model="profileForm.email" placeholder="邮箱" />
          <input v-model="profileForm.role" placeholder="职位" />
          <input v-model="profileForm.department" placeholder="部门" />
          <input v-model="profileForm.phone" placeholder="电话" />
          <input v-model="profileForm.location" placeholder="地区" />
          <input v-model="profileForm.statusMessage" placeholder="状态" />
          <textarea v-model="profileForm.bio" placeholder="个人简介"></textarea>
          <button type="submit">保存资料</button>
        </form>
      </template>

      <template v-else-if="store.activeTab !== 'chats'">
        <header class="page-header">
          <div class="avatar large">群</div>
          <div><h2>联系人与群聊</h2><p>从左侧选择联系人或群聊进入会话，也可以继续扩展好友申请与群管理页面。</p></div>
        </header>
      </template>

      <template v-else>
        <header class="chat-header">
          <div class="avatar">{{ avatarText(store.currentEntity) }}</div>
          <div><h2>{{ store.currentEntity?.name || store.currentEntity?.displayName || '请选择会话' }}</h2><p>{{ store.currentEntity?.notice || 'FlowLink' }}</p></div>
        </header>
        <div class="messages">
          <article v-for="message in store.messages" :key="message.id || message.clientId" class="message" :class="{ mine: String(message.senderId) === String(store.me.id) }">
            <div class="bubble">{{ message.content }}</div>
          </article>
        </div>
        <footer class="composer" v-if="store.selected">
          <label class="icon-btn">
            <Paperclip />
            <input hidden type="file" @change="event => event.target.files?.[0] && store.uploadAndSend(event.target.files[0])" />
          </label>
          <textarea v-model="draft" placeholder="输入消息，Enter 发送" @keydown.enter.prevent="send"></textarea>
          <button class="send-btn" @click="send"><Send />发送</button>
        </footer>
      </template>
    </section>

    <div class="toast" :class="{ show: store.toastText }">{{ store.toastText }}</div>
  </main>
</template>
