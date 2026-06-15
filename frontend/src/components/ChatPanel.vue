<script setup>
import { computed, nextTick, reactive, ref, watch } from "vue";
import { Ban, Crown, DoorOpen, Download, Eye, FileText, Image, Info, Laugh, MessageSquareQuote, Paperclip, RotateCcw, Search, SendHorizontal, Shield, ShieldOff, Trash2, UserMinus, Volume2, VolumeX, X } from "@lucide/vue";
import { avatarText, entitySubtitle, entityTitle, formatFileSize, formatTime } from "../utils/display";

const props = defineProps({
  me: { type: Object, required: true },
  entity: { type: Object, default: null },
  selected: { type: Object, default: null },
  messages: { type: Array, default: () => [] },
  contacts: { type: Array, default: () => [] },
  nameOf: { type: Function, default: (id) => `用户 ${id}` }
});

const emit = defineEmits(["sendText", "sendReply", "sendFile", "recallMessage", "deleteMessage", "loadEarlier", "updateGroup", "inviteGroupMembers", "removeGroupMember", "setGroupAdmin", "setGroupMute", "transferGroupOwner", "leaveGroup", "dissolveGroup", "deleteFriend", "blockFriend"]);
const draft = ref("");
const messageBox = ref(null);
const messageKeyword = ref("");
const detailsOpen = ref(true);
const previewImage = ref("");
const emojiOpen = ref(false);
const replyTarget = ref(null);
const messageMenu = reactive({ open: false, x: 0, y: 0, message: null });
const groupForm = reactive({ name: "", notice: "", description: "", muteAll: false });
const inviteIds = ref([]);
const transferTargetId = ref("");
const emojis = ["😀", "😂", "😊", "👍", "🎉", "❤️", "👌", "🙏", "🔥", "🤝", "😎", "😢"];

const subtitle = computed(() => props.entity ? entitySubtitle(props.entity) : "从左侧选择一个会话开始沟通");
const filteredMessages = computed(() => {
  const keyword = messageKeyword.value.trim().toLowerCase();
  if (!keyword) return props.messages;
  return props.messages.filter((message) => String(message.content || "").toLowerCase().includes(keyword));
});
const fileMessages = computed(() => props.messages.filter((message) => message.messageType === 2 || message.messageType === 3 || message.messageType === "image" || message.messageType === "file"));
const myGroupMember = computed(() => props.entity?.members?.find((member) => String(member.id) === String(props.me.id)));
const canManageGroup = computed(() => props.selected?.type === "group" && Number(myGroupMember.value?.groupRole ?? -1) >= 1);
const isGroupOwner = computed(() => props.selected?.type === "group" && String(props.entity?.ownerId) === String(props.me.id));
const inviteCandidates = computed(() => {
  const memberIds = new Set((props.entity?.members || []).map((member) => String(member.id)));
  return props.contacts.filter((contact) => !memberIds.has(String(contact.id)));
});

watch(
  () => props.messages.length,
  async () => {
    await nextTick();
    if (messageBox.value) messageBox.value.scrollTop = messageBox.value.scrollHeight;
  }
);

watch(
  () => props.entity?.id,
  () => {
    groupForm.name = entityTitle(props.entity);
    groupForm.notice = props.entity?.notice || "";
    groupForm.description = props.entity?.description || "";
    groupForm.muteAll = Boolean(props.entity?.muteAll);
    inviteIds.value = [];
    transferTargetId.value = "";
  },
  { immediate: true }
);

async function send() {
  const content = draft.value.trim();
  if (!content) return;
  if (replyTarget.value) {
    emit("sendReply", content, replyTarget.value);
    replyTarget.value = null;
  } else {
    emit("sendText", content);
  }
  draft.value = "";
}

function chooseFile(event) {
  const file = event.target.files?.[0];
  if (file) emit("sendFile", file);
  event.target.value = "";
}

function messageUrl(message) {
  return message.fileUrl || message.content || "";
}

function isImageMessage(message) {
  return message.messageType === 2 || message.messageType === "image" || String(message.fileType || "").startsWith("image/");
}

function fileTitle(message) {
  if (message.fileName) return message.fileName;
  return isImageMessage(message) ? "聊天图片" : "文件";
}

function canRecall(message) {
  return message.id && !message.recalled && String(message.senderId) === String(props.me.id);
}

function openMessageMenu(event, message) {
  if (!message || message.recalled) return;
  event.preventDefault();
  messageMenu.open = true;
  messageMenu.x = Math.min(event.clientX, window.innerWidth - 190);
  messageMenu.y = Math.min(event.clientY, window.innerHeight - 150);
  messageMenu.message = message;
}

function closeMessageMenu() {
  messageMenu.open = false;
  messageMenu.message = null;
}

function replyFromMenu() {
  if (!messageMenu.message) return;
  replyTarget.value = messageMenu.message;
  closeMessageMenu();
}

function recallFromMenu() {
  if (!messageMenu.message?.id) return;
  emit("recallMessage", messageMenu.message.id);
  closeMessageMenu();
}

function deleteFromMenu() {
  if (!messageMenu.message?.id) return;
  emit("deleteMessage", messageMenu.message.id);
  closeMessageMenu();
}

function addEmoji(emoji) {
  draft.value += emoji;
  emojiOpen.value = false;
}

function highlightedText(content) {
  const text = String(content || "");
  const keyword = messageKeyword.value.trim();
  if (!keyword) return [{ text, hit: false }];
  const lower = text.toLowerCase();
  const target = keyword.toLowerCase();
  const parts = [];
  let start = 0;
  let index = lower.indexOf(target);
  while (index >= 0) {
    if (index > start) parts.push({ text: text.slice(start, index), hit: false });
    parts.push({ text: text.slice(index, index + keyword.length), hit: true });
    start = index + keyword.length;
    index = lower.indexOf(target, start);
  }
  if (start < text.length) parts.push({ text: text.slice(start), hit: false });
  return parts;
}

function toggleInvite(id) {
  inviteIds.value = inviteIds.value.includes(id)
    ? inviteIds.value.filter((item) => item !== id)
    : [...inviteIds.value, id];
}

function saveGroup() {
  if (!props.entity?.id) return;
  emit("updateGroup", props.entity.id, {
    name: groupForm.name.trim() || entityTitle(props.entity),
    notice: groupForm.notice.trim(),
    description: groupForm.description.trim(),
    avatarUrl: props.entity.avatarUrl || "",
    muteAll: groupForm.muteAll
  });
}

function inviteMembers() {
  if (!props.entity?.id || !inviteIds.value.length) return;
  emit("inviteGroupMembers", props.entity.id, inviteIds.value);
  inviteIds.value = [];
}

function confirmDeleteFriend() {
  if (!props.entity?.id) return;
  if (window.confirm(`确定删除好友「${entityTitle(props.entity)}」吗？删除后双方联系人列表都会移除。`)) {
    emit("deleteFriend", props.entity.id);
  }
}

function confirmBlockFriend() {
  if (!props.entity?.id) return;
  if (window.confirm(`确定拉黑「${entityTitle(props.entity)}」吗？拉黑后对方不能再给你发送私聊消息。`)) {
    emit("blockFriend", props.entity.id);
  }
}

function confirmLeaveGroup() {
  if (!props.entity?.id) return;
  if (window.confirm(`确定退出群聊「${entityTitle(props.entity)}」吗？`)) {
    emit("leaveGroup", props.entity.id);
  }
}

function confirmDissolveGroup() {
  if (!props.entity?.id) return;
  if (window.confirm(`确定解散群聊「${entityTitle(props.entity)}」吗？此操作会让所有成员失去该群。`)) {
    emit("dissolveGroup", props.entity.id);
  }
}

function transferOwner() {
  if (!props.entity?.id || !transferTargetId.value) return;
  if (window.confirm("确定转让群主吗？转让后你会变为管理员。")) {
    emit("transferGroupOwner", props.entity.id, transferTargetId.value);
    transferTargetId.value = "";
  }
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
      <button class="load-earlier-btn" type="button" @click="$emit('loadEarlier')">加载更早消息</button>
      <article
        v-for="message in filteredMessages"
        :key="message.id || message.clientId || message.sendTime"
        class="message"
        :class="{ mine: String(message.senderId) === String(me.id) }"
        @contextmenu.prevent="openMessageMenu($event, message)"
      >
        <div class="message-avatar">{{ avatarText({ displayName: nameOf(message.senderId) }) }}</div>
        <div class="message-stack">
          <small>
            <span>{{ String(message.senderId) === String(me.id) ? '我' : nameOf(message.senderId) }}</span>
            <time>{{ formatTime(message.sendTime || message.createdAt) }}</time>
          </small>
          <div v-if="message.recalled" class="recalled-message">
            {{ String(message.senderId) === String(me.id) ? '你撤回了一条消息' : `${nameOf(message.senderId)} 撤回了一条消息` }}
          </div>
          <button
            v-else-if="isImageMessage(message)"
            class="bubble image-message"
            type="button"
            @click="previewImage = messageUrl(message)"
          >
            <img :src="messageUrl(message)" alt="聊天图片" />
          </button>
          <div
            v-else-if="message.messageType === 3 || message.messageType === 'file'"
            class="bubble file-message"
          >
            <FileText />
            <span>
              <strong>{{ fileTitle(message) }}</strong>
              <small>{{ formatFileSize(message.fileSize) }} · {{ message.fileType || '文件' }}</small>
            </span>
            <div class="file-actions">
              <a :href="messageUrl(message)" target="_blank" rel="noreferrer" title="预览"><Eye /></a>
              <a :href="messageUrl(message)" :download="fileTitle(message)" title="下载"><Download /></a>
            </div>
          </div>
          <div v-else class="bubble">
            <template v-for="(part, index) in highlightedText(message.content)" :key="index">
              <mark v-if="part.hit">{{ part.text }}</mark>
              <template v-else>{{ part.text }}</template>
            </template>
          </div>
          <button
            v-if="!message.recalled"
            class="message-action"
            type="button"
            title="引用回复"
            @click="replyTarget = message"
          >
            <MessageSquareQuote />回复
          </button>
          <button
            v-if="canRecall(message)"
            class="message-action"
            type="button"
            title="撤回消息"
            @click="$emit('recallMessage', message.id)"
          >
            <RotateCcw />撤回
          </button>
        </div>
      </article>
      <div v-if="messageMenu.open" class="message-menu-mask" @click="closeMessageMenu" @contextmenu.prevent="closeMessageMenu"></div>
      <div
        v-if="messageMenu.open"
        class="message-context-menu"
        :style="{ left: `${messageMenu.x}px`, top: `${messageMenu.y}px` }"
      >
        <button type="button" @click="replyFromMenu">
          <MessageSquareQuote />回复
        </button>
        <button v-if="canRecall(messageMenu.message)" type="button" @click="recallFromMenu">
          <RotateCcw />撤回
        </button>
        <button type="button" class="danger" @click="deleteFromMenu">
          <Trash2 />删除
        </button>
      </div>
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

      <div v-if="selected.type === 'group'" class="detail-section group-admin-panel">
        <strong>群聊管理</strong>
        <template v-if="canManageGroup">
          <label>
            <span>群名称</span>
            <input v-model="groupForm.name" />
          </label>
          <label>
            <span>群公告</span>
            <textarea v-model="groupForm.notice" placeholder="填写群公告"></textarea>
          </label>
          <label>
            <span>群描述</span>
            <textarea v-model="groupForm.description" placeholder="填写群介绍"></textarea>
          </label>
          <label class="switch-row">
            <span>全员禁言</span>
            <input v-model="groupForm.muteAll" type="checkbox" />
          </label>
          <button class="panel-primary" type="button" @click="saveGroup">保存群设置</button>

          <div class="mini-section">
            <strong>邀请成员</strong>
            <div class="invite-pool">
              <button
                v-for="contact in inviteCandidates"
                :key="contact.id"
                type="button"
                :class="{ active: inviteIds.includes(contact.id) }"
                @click="toggleInvite(contact.id)"
              >
                {{ entityTitle(contact) }}
              </button>
              <p v-if="!inviteCandidates.length">暂无可邀请联系人</p>
            </div>
            <button class="panel-secondary" type="button" :disabled="!inviteIds.length" @click="inviteMembers">
              邀请 {{ inviteIds.length }} 人
            </button>
          </div>
        </template>
        <p v-else class="muted-text">只有群主或管理员可以管理群聊。</p>
      </div>

      <div v-if="selected.type === 'group'" class="detail-section">
        <strong>群成员</strong>
        <div class="member-admin-list">
          <article v-for="member in entity?.members || []" :key="member.id" class="member-admin-row">
            <div class="avatar">{{ avatarText(member) }}</div>
            <div>
              <strong>{{ entityTitle(member) }}</strong>
              <span>
                {{ member.groupRole === 2 ? '群主' : member.groupRole === 1 ? '管理员' : '成员' }}
                <template v-if="member.muted"> · 已禁言</template>
              </span>
            </div>
            <div v-if="canManageGroup && String(member.id) !== String(me.id)" class="member-actions">
              <button
                v-if="isGroupOwner && member.groupRole !== 2"
                type="button"
                :title="member.groupRole === 1 ? '取消管理员' : '设为管理员'"
                @click="$emit('setGroupAdmin', entity.id, member.id, member.groupRole !== 1)"
              >
                <component :is="member.groupRole === 1 ? ShieldOff : Shield" />
              </button>
              <button
                v-if="member.groupRole !== 2 && (isGroupOwner || member.groupRole === 0)"
                type="button"
                :title="member.muted ? '解除禁言' : '禁言'"
                @click="$emit('setGroupMute', entity.id, member.id, !member.muted)"
              >
                <component :is="member.muted ? Volume2 : VolumeX" />
              </button>
              <button
                v-if="member.groupRole !== 2 && (isGroupOwner || member.groupRole === 0)"
                type="button"
                title="移除成员"
                @click="$emit('removeGroupMember', entity.id, member.id)"
              >
                <UserMinus />
              </button>
            </div>
          </article>
        </div>
      </div>

      <div v-if="selected.type === 'group'" class="detail-section danger-zone">
        <strong>群关系</strong>
        <div v-if="isGroupOwner" class="transfer-owner-box">
          <select v-model="transferTargetId">
            <option value="">选择新群主</option>
            <option
              v-for="member in (entity?.members || []).filter((item) => String(item.id) !== String(me.id))"
              :key="member.id"
              :value="member.id"
            >
              {{ entityTitle(member) }}
            </option>
          </select>
          <button type="button" :disabled="!transferTargetId" @click="transferOwner">
            <Crown />转让群主
          </button>
        </div>
        <button v-if="!isGroupOwner" class="danger-action" type="button" @click="confirmLeaveGroup">
          <DoorOpen />退出群聊
        </button>
        <button v-else class="danger-action" type="button" @click="confirmDissolveGroup">
          <Trash2 />解散群聊
        </button>
      </div>

      <div v-else class="detail-section danger-zone">
        <strong>好友关系</strong>
        <button class="danger-action" type="button" @click="confirmDeleteFriend">
          <UserMinus />删除好友
        </button>
        <button class="danger-action" type="button" @click="confirmBlockFriend">
          <Ban />拉黑用户
        </button>
      </div>

      <div class="detail-section">
        <strong>文件与图片</strong>
        <div class="detail-files">
          <a
            v-for="message in fileMessages"
            :key="message.id || message.clientId"
            :href="messageUrl(message)"
            target="_blank"
            rel="noreferrer"
          >
            <Paperclip />
            <span>{{ fileTitle(message) }}</span>
          </a>
          <p v-if="!fileMessages.length">暂无文件</p>
        </div>
      </div>
    </aside>
    </div>

    <footer class="composer">
      <div v-if="replyTarget" class="reply-strip">
        <MessageSquareQuote />
        <span>回复 {{ nameOf(replyTarget.senderId) }}：{{ replyTarget.content || '[消息]' }}</span>
        <button type="button" title="取消回复" @click="replyTarget = null"><X /></button>
      </div>
      <div v-if="emojiOpen" class="emoji-panel">
        <button v-for="emoji in emojis" :key="emoji" type="button" @click="addEmoji(emoji)">{{ emoji }}</button>
      </div>
      <button class="icon-btn" type="button" title="表情" @click="emojiOpen = !emojiOpen">
        <Laugh />
      </button>
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

    <div v-if="previewImage" class="preview-mask" @click="previewImage = ''">
      <button class="preview-close" type="button" title="关闭" @click.stop="previewImage = ''"><X /></button>
      <img :src="previewImage" alt="图片预览" @click.stop />
      <a class="preview-download" :href="previewImage" download title="下载图片" @click.stop><Download />下载</a>
    </div>
  </template>
</template>
