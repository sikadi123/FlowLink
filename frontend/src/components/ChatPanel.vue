<script setup>
import { computed, nextTick, ref, watch } from "vue";
import { Image, Info, Paperclip, Search, SendHorizontal, X } from "@lucide/vue";
import { avatarText, entitySubtitle, entityTitle, formatFileSize, formatTime } from "../utils/display";

const props = defineProps({
  me: { type: Object, required: true },
  entity: { type: Object, default: null },
  selected: { type: Object, default: null },
  messages: { type: Array, default: () => [] }
});

const emit = defineEmits(["sendText", "sendFile"]);
const draft = ref("");
const messageBox = ref(null);
const messageKeyword = ref("");
const detailsOpen = ref(true);

const subtitle = computed(() => props.entity ? entitySubtitle(props.entity) : "从左侧选择一个会话开始沟通");
const filteredMessages = computed(() => {
  const keyword = messageKeyword.value.trim().toLowerCase();
  if (!keyword) return props.messages;
  return props.messages.filter((message) => String(message.content || "").toLowerCase().includes(keyword));
});
const fileMessages = computed(() => props.messages.filter((message) => message.messageType === 2 || message.messageType === 3 || message.messageType === "image" || message.messageType === "file"));

watch(
  () => props.messages.length,
  async () => {
    await nextTick();
    if (messageBox.value) messageBox.value.scrollTop = messageBox.value.scrollHeight;
  }
);

async function send() {
  const content = draft.value.trim();
  if (!content) return;
  emit("sendText", content);
  draft.value = "";
}

function chooseFile(event) {
  const file = event.target.files?.[0];
  if (file) emit("sendFile", file);
  event.target.value = "";
}
</script>

<template>
  <template v-if="!selected">
    <section class="welcome-panel">
      <div class="welcome-mark">F</div>
      <h2>选择会话开始聊天</h2>
      <p>左侧会显示消息、群聊和联系人，进入会话后可发送文本、图片和文件。</p>
    </section>
  </template>

  <template v-else>
    <header class="chat-header">
      <div class="avatar" :class="{ group: selected.type === 'group' }">{{ avatarText(entity) }}</div>
      <div>
        <h2>{{ entityTitle(entity) }}</h2>
        <p>{{ subtitle }}</p>
      </div>
      <label class="message-search">
        <Search />
        <input v-model="messageKeyword" placeholder="搜索当前会话" />
      </label>
      <button class="icon-btn" type="button" title="会话信息" @click="detailsOpen = !detailsOpen">
        <Info />
      </button>
    </header>

    <div class="chat-body" :class="{ 'details-open': detailsOpen }">
    <div ref="messageBox" class="messages">
      <article
        v-for="message in filteredMessages"
        :key="message.id || message.clientId || message.sendTime"
        class="message"
        :class="{ mine: String(message.senderId) === String(me.id) }"
      >
        <div class="message-stack">
          <small>{{ formatTime(message.sendTime || message.createdAt) }}</small>
          <a
            v-if="message.messageType === 2 || message.messageType === 'image'"
            class="bubble image-message"
            :href="message.content"
            target="_blank"
            rel="noreferrer"
          >
            <img :src="message.content" alt="聊天图片" />
          </a>
          <a
            v-else-if="message.messageType === 3 || message.messageType === 'file'"
            class="bubble file-message"
            :href="message.content"
            target="_blank"
            rel="noreferrer"
          >
            <Paperclip />
            <span>
              <strong>{{ message.fileName || '打开文件' }}</strong>
              <small>{{ formatFileSize(message.fileSize) }}</small>
            </span>
          </a>
          <div v-else class="bubble">{{ message.content }}</div>
        </div>
      </article>
      <div v-if="!filteredMessages.length" class="message-empty">
        {{ messageKeyword ? "没有匹配的消息" : "还没有消息，发一句开始吧" }}
      </div>
    </div>

    <aside v-if="detailsOpen" class="chat-details">
      <button class="details-close" type="button" title="关闭" @click="detailsOpen = false"><X /></button>
      <div class="details-profile">
        <div class="avatar large" :class="{ group: selected.type === 'group' }">{{ avatarText(entity) }}</div>
        <h3>{{ entityTitle(entity) }}</h3>
        <p>{{ subtitle }}</p>
      </div>

      <div class="detail-section">
        <strong>会话信息</strong>
        <dl>
          <div><dt>类型</dt><dd>{{ selected.type === 'group' ? '群聊' : '私聊' }}</dd></div>
          <div v-if="entity?.department"><dt>部门</dt><dd>{{ entity.department }}</dd></div>
          <div v-if="entity?.location"><dt>地区</dt><dd>{{ entity.location }}</dd></div>
          <div v-if="entity?.notice"><dt>公告</dt><dd>{{ entity.notice }}</dd></div>
        </dl>
      </div>

      <div class="detail-section">
        <strong>文件与图片</strong>
        <div class="detail-files">
          <a
            v-for="message in fileMessages"
            :key="message.id || message.clientId"
            :href="message.content"
            target="_blank"
            rel="noreferrer"
          >
            <Paperclip />
            <span>{{ message.fileName || (message.messageType === 2 || message.messageType === 'image' ? '聊天图片' : '文件') }}</span>
          </a>
          <p v-if="!fileMessages.length">暂无文件</p>
        </div>
      </div>
    </aside>
    </div>

    <footer class="composer">
      <label class="icon-btn" title="发送文件">
        <Paperclip />
        <input hidden type="file" @change="chooseFile" />
      </label>
      <label class="icon-btn" title="发送图片">
        <Image />
        <input hidden accept="image/*" type="file" @change="chooseFile" />
      </label>
      <textarea
        v-model="draft"
        placeholder="输入消息，Enter 发送，Shift+Enter 换行"
        @keydown.enter.exact.prevent="send"
      ></textarea>
      <button class="send-btn" type="button" @click="send"><SendHorizontal />发送</button>
    </footer>
  </template>
</template>
