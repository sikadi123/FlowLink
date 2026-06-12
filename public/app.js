const state = {
  token: localStorage.getItem("flowlink_token") || "",
  me: null,
  contacts: [],
  groups: [],
  requests: [],
  notifications: [],
  stats: {},
  activeTab: "chats",
  selected: null,
  messages: [],
  ws: null,
  reconnectTimer: null,
  heartbeatTimer: null,
  typingTimer: null,
  remoteTypingTimer: null,
  pending: new Map(),
};

const $ = (selector) => document.querySelector(selector);

const els = {
  authView: $("#authView"),
  workspaceView: $("#workspaceView"),
  loginForm: $("#loginForm"),
  registerForm: $("#registerForm"),
  showLogin: $("#showLogin"),
  showRegister: $("#showRegister"),
  authMessage: $("#authMessage"),
  loginAccount: $("#loginAccount"),
  loginPassword: $("#loginPassword"),
  registerName: $("#registerName"),
  registerUsername: $("#registerUsername"),
  registerEmail: $("#registerEmail"),
  registerPassword: $("#registerPassword"),
  meAvatar: $("#meAvatar"),
  sidebarTitle: $("#sidebarTitle"),
  connectionText: $("#connectionText"),
  listView: $("#listView"),
  searchInput: $("#searchInput"),
  chatAvatar: $("#chatAvatar"),
  chatTitle: $("#chatTitle"),
  chatSubTitle: $("#chatSubTitle"),
  messageList: $("#messageList"),
  typingLine: $("#typingLine"),
  messageInput: $("#messageInput"),
  sendBtn: $("#sendBtn"),
  imageBtn: $("#imageBtn"),
  imageInput: $("#imageInput"),
  fileBtn: $("#fileBtn"),
  fileInput: $("#fileInput"),
  emojiBtn: $("#emojiBtn"),
  emojiPanel: $("#emojiPanel"),
  detailsBtn: $("#detailsBtn"),
  detailsPane: $("#detailsPane"),
  detailsContent: $("#detailsContent"),
  closeDetailsBtn: $("#closeDetailsBtn"),
  newGroupBtn: $("#newGroupBtn"),
  logoutBtn: $("#logoutBtn"),
  mobileBackBtn: $("#mobileBackBtn"),
  toast: $("#toast"),
};

const emojis = ["😀", "😂", "😊", "😍", "👍", "👏", "🎉", "🔥", "💡", "✅", "🙏", "💬", "🚀", "📌", "☕", "🌙"];
const colors = ["#07c160", "#2f80ed", "#7c3aed", "#f97316", "#0f766e", "#e11d48"];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function avatarHtml(entity, sizeClass = "") {
  const avatar = entity?.avatar || { text: "F", background: "#07c160" };
  if (avatar.url) return `<div class="avatar ${sizeClass}"><img src="${escapeHtml(avatar.url)}" alt="" /></div>`;
  return `<div class="avatar ${sizeClass}" style="background:${escapeHtml(avatar.background || "#07c160")}">${escapeHtml(avatar.text || "F")}</div>`;
}

function renderAvatarInto(element, entity) {
  const avatar = entity?.avatar || { text: "F", background: "#07c160" };
  element.textContent = avatar.text || "F";
  element.style.background = avatar.background || "#07c160";
}

function formatTime(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay
    ? date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}

function formatFileSize(bytes) {
  const size = Number(bytes || 0);
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  if (size >= 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${size || 0} B`;
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => els.toast.classList.remove("show"), 2200);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) throw new Error(payload.message || "请求失败");
  return payload.data;
}

function setAuthMode(mode) {
  const isLogin = mode === "login";
  els.loginForm.classList.toggle("hidden", !isLogin);
  els.registerForm.classList.toggle("hidden", isLogin);
  els.showLogin.classList.toggle("active", isLogin);
  els.showRegister.classList.toggle("active", !isLogin);
  els.authMessage.textContent = "";
}

async function enterWorkspace() {
  const data = await api("/api/bootstrap");
  state.me = data.user;
  state.contacts = data.contacts;
  state.groups = data.groups;
  state.requests = data.requests;
  state.notifications = data.notifications || [];
  state.stats = data.stats || {};
  els.authView.classList.add("hidden");
  els.workspaceView.classList.remove("hidden");
  renderAvatarInto(els.meAvatar, state.me);
  renderList();
  renderDetails();
  connectWs();
  if (!state.selected && state.groups[0]) await selectConversation("group", state.groups[0].id);
}

async function refreshBootstrap() {
  const data = await api("/api/bootstrap");
  state.me = data.user;
  state.contacts = data.contacts;
  state.groups = data.groups;
  state.requests = data.requests;
  state.notifications = data.notifications || [];
  state.stats = data.stats || {};
  renderAvatarInto(els.meAvatar, state.me);
  renderList();
  renderChatHeader();
  renderDetails();
}

function connectWs() {
  if (!state.token) return;
  clearTimeout(state.reconnectTimer);
  if (state.ws) state.ws.close();
  const protocol = location.protocol === "https:" ? "wss" : "ws";
  const ws = new WebSocket(`${protocol}://${location.host}/ws?token=${encodeURIComponent(state.token)}`);
  state.ws = ws;
  els.connectionText.textContent = "连接中";
  ws.addEventListener("open", () => {
    els.connectionText.textContent = "在线";
    clearInterval(state.heartbeatTimer);
    state.heartbeatTimer = setInterval(() => sendWs("heartbeat"), 18000);
  });
  ws.addEventListener("message", async (event) => handleWs(JSON.parse(event.data)));
  ws.addEventListener("close", () => {
    els.connectionText.textContent = "重连中";
    clearInterval(state.heartbeatTimer);
    state.reconnectTimer = setTimeout(connectWs, 1200);
  });
}

function sendWs(action, payload = {}) {
  if (state.ws?.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify({ action, payload }));
    return true;
  }
  return false;
}

async function handleWs(packet) {
  const { action, payload } = packet;
  if (action === "message_ack") {
    const pending = state.pending.get(payload.clientId);
    if (pending) {
      pending.status = payload.status || "sent";
      pending.id = payload.messageId;
      renderMessages();
    }
    return;
  }
  if (action === "new_message") {
    const message = payload.message;
    updateConversationPreview(message);
    if (message.conversationId === state.selected?.conversationId) {
      upsertMessage(message);
      sendWs("read_conversation", selectedPayload());
    } else if (message.senderId !== state.me.id) {
      incrementUnread(message);
    }
    renderList();
    renderMessages();
    return;
  }
  if (action === "message_recalled") {
    state.messages = state.messages.map((message) => (message.id === payload.messageId ? { ...message, status: "recalled" } : message));
    renderList();
    renderMessages();
    return;
  }
  if (action === "typing" && state.selected?.conversationId === payload.conversationId && payload.typing) {
    els.typingLine.textContent = `${payload.from.displayName} 正在输入`;
    clearTimeout(state.remoteTypingTimer);
    state.remoteTypingTimer = setTimeout(() => (els.typingLine.textContent = ""), 1800);
    return;
  }
  if (["presence", "friend_request", "friend_request_updated", "group_created", "group_updated", "group_dissolved"].includes(action)) {
    await refreshBootstrap();
    if (action === "group_dissolved" && state.selected?.id === payload.groupId) state.selected = null;
  }
  if (action === "read_receipt" && state.selected?.conversationId === payload.conversationId && payload.readerId !== state.me.id) {
    state.messages = state.messages.map((message) => (message.senderId === state.me.id ? { ...message, statusLabel: "已读" } : message));
    renderMessages();
  }
}

function upsertMessage(message) {
  const index = state.messages.findIndex((item) => item.id === message.id);
  if (index >= 0) state.messages[index] = message;
  else state.messages.push(message);
  if (message.senderId === state.me.id) {
    for (const [clientId, pending] of state.pending) {
      if (pending.content === message.content && pending.conversationId === message.conversationId) state.pending.delete(clientId);
    }
  }
}

function updateConversationPreview(message) {
  const collection = message.conversationType === "group" ? state.groups : state.contacts;
  const item = collection.find((entry) => entry.conversationId === message.conversationId);
  if (item) item.lastMessage = message;
}

function incrementUnread(message) {
  const collection = message.conversationType === "group" ? state.groups : state.contacts;
  const item = collection.find((entry) => entry.conversationId === message.conversationId);
  if (item) item.unread = (item.unread || 0) + 1;
}

function selectedPayload() {
  return { conversationType: state.selected.type, targetId: state.selected.id };
}

function currentEntity() {
  if (!state.selected) return null;
  return state.selected.type === "group"
    ? state.groups.find((item) => item.id === state.selected.id)
    : state.contacts.find((item) => item.id === state.selected.id);
}

function conversationItems() {
  return [...state.contacts, ...state.groups]
    .filter((item) => item.lastMessage)
    .sort((a, b) => new Date(b.lastMessage?.createdAt || 0) - new Date(a.lastMessage?.createdAt || 0));
}

function renderList() {
  const titleMap = { chats: "聊天", contacts: "联系人", requests: "申请", settings: "资料" };
  els.sidebarTitle.textContent = titleMap[state.activeTab] || "聊天";
  const keyword = els.searchInput.value.trim().toLowerCase();
  if (state.activeTab === "settings") return renderSettingsList();
  if (state.activeTab === "requests") return renderRequestsList();
  const source =
    state.activeTab === "contacts"
      ? [...state.contacts, ...state.groups].sort((a, b) => (a.displayName || a.name).localeCompare(b.displayName || b.name, "zh-CN"))
      : conversationItems();
  const filtered = source.filter((item) => !keyword || (item.name || item.displayName || "").toLowerCase().includes(keyword));
  els.listView.innerHTML = filtered.length
    ? filtered.map(renderListItem).join("")
    : `<div class="request-card">暂无内容</div>`;
}

function renderListItem(item) {
  const type = item.conversationType || (item.memberIds ? "group" : "private");
  const active = state.selected?.type === type && state.selected?.id === item.id ? "active" : "";
  const title = item.name || item.displayName;
  const preview = previewText(item.lastMessage) || (type === "group" ? `${item.members?.length || item.memberIds?.length || 0} 位成员` : item.role || "");
  const online = type === "private" && item.status === "online" ? "online" : "";
  return `
    <article class="list-item ${active}" data-type="${type}" data-id="${item.id}">
      ${avatarHtml(item)}
      <div class="list-item-main">
        <div class="list-item-title">
          <span>${escapeHtml(title)}</span>
          <span class="list-item-time">${formatTime(item.lastMessage?.createdAt)}</span>
        </div>
        <div class="list-item-preview">${escapeHtml(preview)}</div>
      </div>
      <div>${item.unread ? `<span class="badge">${item.unread}</span>` : `<span class="status-dot ${online}"></span>`}</div>
    </article>`;
}

function previewText(message) {
  if (!message) return "";
  if (message.status === "recalled") return "消息已撤回";
  if (message.messageType === "image") return "[图片]";
  if (message.messageType === "file") return `[文件] ${message.fileName || "附件"}`;
  return message.content || "";
}

function renderRequestsList() {
  const items = state.requests.length ? state.requests : [];
  els.listView.innerHTML = items.length
    ? items.map((request) => {
        const fromMe = request.fromId === state.me.id;
        const person = fromMe ? request.to : request.from;
        return `
          <article class="request-card">
            <div class="member-line">${avatarHtml(person)}<div><strong>${escapeHtml(person.displayName)}</strong><span>${escapeHtml(request.status)}</span></div></div>
            <p>${escapeHtml(request.message || "好友申请")}</p>
            ${!fromMe && request.status === "pending" ? `<div class="actions"><button class="small-action primary" data-accept="${request.id}">同意</button><button class="small-action danger" data-reject="${request.id}">拒绝</button></div>` : ""}
          </article>`;
      }).join("")
    : `<div class="request-card">暂无申请</div>`;
}

function renderSettingsList() {
  els.listView.innerHTML = `
    <article class="request-card">
      <div class="member-line">${avatarHtml(state.me)}<div><strong>${escapeHtml(state.me.displayName)}</strong><span>${escapeHtml(state.me.username)}</span></div></div>
      <p>${escapeHtml(state.me.statusMessage || state.me.bio || "")}</p>
    </article>
    <article class="request-card">
      <button class="small-action primary" id="openProfileBtn">编辑资料</button>
      <button class="small-action primary" id="openSearchBtn">添加好友</button>
    </article>`;
}

async function selectConversation(type, id) {
  const entity = type === "group" ? state.groups.find((item) => item.id === id) : state.contacts.find((item) => item.id === id);
  if (!entity) return;
  state.selected = { type, id, conversationId: entity.conversationId || id };
  entity.unread = 0;
  els.workspaceView.classList.add("chat-open");
  renderChatHeader();
  renderList();
  renderDetails();
  state.messages = await api(`/api/messages/history?type=${encodeURIComponent(type)}&targetId=${encodeURIComponent(id)}`);
  renderMessages();
  sendWs("read_conversation", selectedPayload());
}

function renderChatHeader() {
  const item = currentEntity();
  if (!item) return;
  renderAvatarInto(els.chatAvatar, item);
  els.chatTitle.textContent = item.name || item.displayName;
  els.chatSubTitle.textContent = state.selected.type === "group"
    ? `${item.members?.length || 0} 位成员 · ${item.notice || "暂无公告"}`
    : `${item.status === "online" ? "在线" : "离线"} · ${item.role || ""}`;
}

function renderMessages() {
  if (!state.selected) return;
  const pending = [...state.pending.values()].filter((item) => item.conversationId === state.selected.conversationId);
  const all = [...state.messages, ...pending].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  if (!all.length) {
    els.messageList.innerHTML = `<div class="empty-logo">FlowLink</div>`;
    els.messageList.classList.add("empty-state");
    return;
  }
  els.messageList.classList.remove("empty-state");
  els.messageList.innerHTML = all.map(renderMessage).join("");
  els.messageList.scrollTop = els.messageList.scrollHeight;
}

function renderMessage(message) {
  const mine = message.senderId === state.me.id;
  const sender = message.sender || findUser(message.senderId) || state.me;
  const canRecall =
    mine && message.id && !message.id.startsWith("local_") && message.status !== "recalled" && Date.now() - new Date(message.createdAt).getTime() < 120000;
  const content =
    message.status === "recalled"
      ? `<div class="bubble recalled">消息已撤回</div>`
      : message.messageType === "image"
        ? `<div class="bubble image-bubble"><img src="${escapeHtml(message.content)}" alt="聊天图片" /></div>`
        : message.messageType === "file"
          ? `<a class="bubble file-bubble" href="${escapeHtml(message.content)}" download="${escapeHtml(message.fileName || "FlowLink 文件")}">
              <span class="file-icon">FILE</span>
              <span><strong>${escapeHtml(message.fileName || "未命名文件")}</strong><small>${escapeHtml(formatFileSize(message.fileSize))} · ${escapeHtml(message.fileType || "文件")}</small></span>
            </a>`
        : `<div class="bubble">${escapeHtml(message.content).replaceAll("\n", "<br />")}</div>`;
  return `
    <article class="message-row ${mine ? "mine" : ""}">
      ${avatarHtml(sender)}
      <div class="message-body">
        <div class="message-meta">${escapeHtml(sender.displayName || "")} · ${formatTime(message.createdAt)}</div>
        ${content}
        <div class="message-actions">
          ${mine ? `<span class="message-state">${escapeHtml(message.statusLabel || messageStatusText(message))}</span>` : ""}
          ${canRecall ? `<button data-recall="${message.id}">撤回</button>` : ""}
        </div>
      </div>
    </article>`;
}

function messageStatusText(message) {
  if (message.status === "sending") return "发送中";
  if (message.status === "failed") return "发送失败";
  if (message.status === "recalled") return "已撤回";
  if (message.readBy?.some((userId) => userId !== state.me.id)) return "已读";
  if (message.deliveredTo?.length) return "已送达";
  return "已发送";
}

function findUser(userId) {
  for (const contact of state.contacts) if (contact.id === userId) return contact;
  for (const group of state.groups) {
    const member = group.members?.find((item) => item.id === userId);
    if (member) return member;
  }
  return null;
}

async function sendMessage(messageType = "text", contentOverride = "", metadata = {}) {
  if (!state.selected) return toast("请先选择会话");
  const content = contentOverride || els.messageInput.value.trim();
  if (!content) return;
  const clientId = `local_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  state.pending.set(clientId, {
    id: clientId,
    conversationType: state.selected.type,
    conversationId: state.selected.conversationId,
    senderId: state.me.id,
    sender: state.me,
    content,
    messageType,
    ...metadata,
    status: "sending",
    statusLabel: "发送中",
    createdAt: new Date().toISOString(),
  });
  els.messageInput.value = "";
  resizeComposer();
  renderMessages();
  const sent = sendWs("send_message", { ...selectedPayload(), messageType, content, clientId, ...metadata });
  if (!sent) {
    try {
      const saved = await api("/api/messages/send", { method: "POST", body: JSON.stringify({ ...selectedPayload(), messageType, content, clientId, ...metadata }) });
      state.pending.delete(clientId);
      upsertMessage(saved);
      renderMessages();
    } catch (error) {
      const pending = state.pending.get(clientId);
      if (pending) {
        pending.status = "failed";
        pending.statusLabel = "发送失败";
      }
      toast(error.message);
      renderMessages();
    }
  }
}

function resizeComposer() {
  els.messageInput.style.height = "auto";
  els.messageInput.style.height = `${Math.min(120, els.messageInput.scrollHeight)}px`;
}

function notifyTyping() {
  if (!state.selected) return;
  sendWs("typing", { ...selectedPayload(), typing: true });
  clearTimeout(state.typingTimer);
  state.typingTimer = setTimeout(() => sendWs("typing", { ...selectedPayload(), typing: false }), 900);
}

async function recallMessage(messageId) {
  try {
    await api(`/api/messages/${encodeURIComponent(messageId)}/recall`, { method: "POST" });
    state.messages = state.messages.map((message) => (message.id === messageId ? { ...message, status: "recalled" } : message));
    renderMessages();
  } catch (error) {
    toast(error.message);
  }
}

function renderDetails() {
  if (state.activeTab === "settings") return renderProfilePanel();
  const entity = currentEntity();
  if (!entity) {
    els.detailsContent.innerHTML = `<div class="profile-card"><p>选择会话后查看详情</p></div>`;
    return;
  }
  if (state.selected.type === "group") return renderGroupPanel(entity);
  return renderContactPanel(entity);
}

function renderContactPanel(entity) {
  els.detailsContent.innerHTML = `
    <div class="profile-card rich-profile">
      <div class="profile-cover">${avatarHtml(entity, "avatar-large")}<div><h3>${escapeHtml(entity.displayName)}</h3><span>${escapeHtml(entity.statusMessage || entity.role || "")}</span></div></div>
      <div class="info-grid">
        <div><span>账号</span><strong>${escapeHtml(entity.username)}</strong></div>
        <div><span>部门</span><strong>${escapeHtml(entity.department || "-")}</strong></div>
        <div><span>地区</span><strong>${escapeHtml(entity.location || "-")}</strong></div>
        <div><span>状态</span><strong>${entity.status === "online" ? "在线" : "离线"}</strong></div>
      </div>
      <p>${escapeHtml(entity.bio || "")}</p>
    </div>`;
}

function swatches(selected) {
  return `<div class="color-swatches">${colors.map((color) => `<button type="button" class="${selected === color ? "selected" : ""}" data-color="${color}" style="background:${color}" title="${color}"></button>`).join("")}</div>`;
}

function renderProfilePanel() {
  els.detailsContent.innerHTML = `
    <div class="profile-card rich-profile">
      <div class="profile-cover">${avatarHtml(state.me, "avatar-large")}<div><h3>${escapeHtml(state.me.displayName)}</h3><span>${escapeHtml(state.me.statusMessage || "")}</span></div></div>
      <div class="stat-grid">
        <div><strong>${state.stats.users || 0}</strong><span>用户</span></div>
        <div><strong>${state.stats.groups || 0}</strong><span>群聊</span></div>
        <div><strong>${state.stats.messages || 0}</strong><span>消息</span></div>
        <div><strong>${state.stats.online || 0}</strong><span>在线</span></div>
      </div>
      <form class="panel-form profile-form" id="profileForm">
        <label><span>昵称</span><input id="profileName" maxlength="20" value="${escapeHtml(state.me.displayName)}" /></label>
        <label><span>用户名</span><input id="profileUsername" maxlength="20" value="${escapeHtml(state.me.username)}" /></label>
        <label><span>邮箱</span><input id="profileEmail" maxlength="100" value="${escapeHtml(state.me.email)}" /></label>
        <label><span>职责</span><input id="profileRole" maxlength="30" value="${escapeHtml(state.me.role || "")}" /></label>
        <label><span>部门</span><input id="profileDepartment" maxlength="30" value="${escapeHtml(state.me.department || "")}" /></label>
        <label><span>电话</span><input id="profilePhone" maxlength="30" value="${escapeHtml(state.me.phone || "")}" /></label>
        <label><span>地区</span><input id="profileLocation" maxlength="30" value="${escapeHtml(state.me.location || "")}" /></label>
        <label><span>状态</span><input id="profileStatus" maxlength="80" value="${escapeHtml(state.me.statusMessage || "")}" /></label>
        <label class="full"><span>个人简介</span><textarea id="profileBio" maxlength="160" rows="3">${escapeHtml(state.me.bio || "")}</textarea></label>
        <div class="full">${swatches(state.me.avatar?.background)}</div>
        <button class="small-action primary full" type="submit">保存资料</button>
      </form>
      <strong>通知</strong>
      <div class="notification-list">${state.notifications.length ? state.notifications.slice(0, 8).map((item) => `<p>${escapeHtml(item.content)}<span>${formatTime(item.createdAt)}</span></p>`).join("") : "<p>暂无通知</p>"}</div>
    </div>`;
}

function renderGroupPanel(group) {
  const canManage = group.ownerId === state.me.id || group.admins?.includes(state.me.id);
  const candidates = state.contacts.filter((contact) => !group.memberIds.includes(contact.id));
  els.detailsContent.innerHTML = `
    <div class="profile-card group-panel">
      <div class="profile-cover">${avatarHtml(group, "avatar-large")}<div><h3>${escapeHtml(group.name)}</h3><span>${group.members?.length || 0} 位成员 · ${group.muted ? "免打扰" : "正常接收"}</span></div></div>
      <form class="panel-form" id="groupForm">
        <label><span>群名称</span><input id="groupNameEdit" maxlength="40" value="${escapeHtml(group.name)}" ${canManage ? "" : "disabled"} /></label>
        <label><span>群公告</span><textarea id="groupNoticeEdit" maxlength="160" rows="3" ${canManage ? "" : "disabled"}>${escapeHtml(group.notice || "")}</textarea></label>
        <label><span>群介绍</span><textarea id="groupDescriptionEdit" maxlength="200" rows="3" ${canManage ? "" : "disabled"}>${escapeHtml(group.description || "")}</textarea></label>
        <label class="toggle-line"><input id="groupMutedEdit" type="checkbox" ${group.muted ? "checked" : ""} ${canManage ? "" : "disabled"} /> 群消息免打扰</label>
        <label class="toggle-line"><input id="groupMuteAllEdit" type="checkbox" ${group.muteAll ? "checked" : ""} ${canManage ? "" : "disabled"} /> 全员禁言（管理员可发言）</label>
        ${canManage ? `<div>${swatches(group.avatar?.background)}</div><button class="small-action primary" type="submit">保存群资料</button>` : ""}
      </form>
      ${canManage ? `<section><strong>邀请好友</strong><div class="chip-list">${candidates.length ? candidates.map((contact) => `<label class="chip"><input type="checkbox" value="${contact.id}" />${escapeHtml(contact.displayName)}</label>`).join("") : "<span>暂无可邀请好友</span>"}</div><button class="small-action primary" id="inviteMembersBtn">邀请入群</button></section>` : ""}
      <section><strong>成员</strong><div class="member-list">${group.members.map((member) => renderMemberLine(group, member, canManage)).join("")}</div></section>
      <div class="danger-zone">
        ${group.ownerId === state.me.id ? `<button class="small-action danger" id="dissolveGroupBtn">解散群聊</button>` : `<button class="small-action danger" id="leaveGroupBtn">退出群聊</button>`}
      </div>
    </div>`;
}

function renderMemberLine(group, member, canManage) {
  const role = group.ownerId === member.id ? "群主" : group.admins?.includes(member.id) ? "管理员" : member.role || "成员";
  const removable = canManage && member.id !== state.me.id && member.id !== group.ownerId;
  const muted = group.mutedMembers?.includes(member.id);
  const mutable = canManage && member.id !== group.ownerId;
  return `<div class="member-line">${avatarHtml(member)}<div><strong>${escapeHtml(member.displayName)}</strong><span>${escapeHtml(role)}${muted ? " · 已禁言" : ""}</span></div>${mutable ? `<button class="small-action" data-toggle-mute="${member.id}" data-muted="${muted ? "false" : "true"}">${muted ? "解除禁言" : "禁言"}</button>` : ""}${removable ? `<button class="small-action danger" data-remove-member="${member.id}">移除</button>` : ""}</div>`;
}

function renderSearchPanel() {
  els.detailsContent.innerHTML = `<div class="panel-form"><input id="userSearchInput" placeholder="昵称 / 用户名 / 邮箱" /><button class="small-action primary" id="userSearchBtn">搜索用户</button></div><div id="userSearchResults"></div>`;
}

function renderCreateGroupPanel() {
  els.detailsPane.classList.add("open");
  els.detailsContent.innerHTML = `
    <div class="profile-card">
      <strong>创建群聊</strong>
      <form class="panel-form" id="createGroupForm">
        <label><span>群名称</span><input id="groupNameInput" maxlength="40" placeholder="例如：产品联调小组" /></label>
        <label><span>群公告</span><textarea id="groupNoticeInput" maxlength="160" rows="3" placeholder="写一句群公告"></textarea></label>
        <label><span>群介绍</span><textarea id="groupDescriptionInput" maxlength="200" rows="3" placeholder="群聊用途、规则或说明"></textarea></label>
        ${swatches("#07c160")}
        <strong>选择成员</strong>
        <div class="chip-list">${state.contacts.map((contact) => `<label class="chip"><input type="checkbox" value="${contact.id}" />${escapeHtml(contact.displayName)}</label>`).join("")}</div>
        <button class="small-action primary" type="submit">创建群聊</button>
      </form>
    </div>`;
}

async function saveProfile(event) {
  event.preventDefault();
  const selectedColor = $(".color-swatches button.selected")?.dataset.color || state.me.avatar?.background;
  const user = await api("/api/me", {
    method: "PATCH",
    body: JSON.stringify({
      displayName: $("#profileName").value,
      username: $("#profileUsername").value,
      email: $("#profileEmail").value,
      role: $("#profileRole").value,
      department: $("#profileDepartment").value,
      phone: $("#profilePhone").value,
      location: $("#profileLocation").value,
      statusMessage: $("#profileStatus").value,
      bio: $("#profileBio").value,
      avatarColor: selectedColor,
    }),
  });
  state.me = user;
  renderAvatarInto(els.meAvatar, state.me);
  renderProfilePanel();
  renderList();
  toast("资料已保存");
}

async function searchUsers() {
  const users = await api(`/api/users?q=${encodeURIComponent($("#userSearchInput").value.trim())}`);
  $("#userSearchResults").innerHTML = users.length
    ? users.map((user) => `<article class="search-result"><div class="member-line">${avatarHtml(user)}<div><strong>${escapeHtml(user.displayName)}</strong><span>${escapeHtml(user.username)}</span></div></div><div class="actions">${user.isFriend ? `<button class="small-action" disabled>已是好友</button>` : user.requestPending ? `<button class="small-action" disabled>已申请</button>` : `<button class="small-action primary" data-add-user="${user.id}">添加</button>`}</div></article>`).join("")
    : `<div class="request-card">没有匹配用户</div>`;
}

async function createGroup(event) {
  event.preventDefault();
  const memberIds = [...document.querySelectorAll("#createGroupForm .chip input:checked")].map((input) => input.value);
  const group = await api("/api/groups", {
    method: "POST",
    body: JSON.stringify({
      name: $("#groupNameInput").value,
      notice: $("#groupNoticeInput").value,
      description: $("#groupDescriptionInput").value,
      avatarColor: $(".color-swatches button.selected")?.dataset.color,
      memberIds,
    }),
  });
  await refreshBootstrap();
  await selectConversation("group", group.id);
  toast("群聊已创建");
}

async function saveGroup(event) {
  event.preventDefault();
  const group = currentEntity();
  await api(`/api/groups/${encodeURIComponent(group.id)}`, {
    method: "PATCH",
    body: JSON.stringify({
      name: $("#groupNameEdit").value,
      notice: $("#groupNoticeEdit").value,
      description: $("#groupDescriptionEdit").value,
      muted: $("#groupMutedEdit").checked,
      muteAll: $("#groupMuteAllEdit").checked,
      avatarColor: $(".color-swatches button.selected")?.dataset.color,
    }),
  });
  await refreshBootstrap();
  toast("群资料已保存");
}

async function inviteMembers() {
  const group = currentEntity();
  const memberIds = [...document.querySelectorAll(".group-panel .chip input:checked")].map((input) => input.value);
  await api(`/api/groups/${encodeURIComponent(group.id)}/members`, { method: "POST", body: JSON.stringify({ memberIds }) });
  await refreshBootstrap();
  toast("已邀请成员");
}

async function removeMember(memberId) {
  const group = currentEntity();
  await api(`/api/groups/${encodeURIComponent(group.id)}/members/${encodeURIComponent(memberId)}`, { method: "DELETE" });
  await refreshBootstrap();
  toast("成员已移除");
}

async function setMemberMute(memberId, muted) {
  const group = currentEntity();
  await api(`/api/groups/${encodeURIComponent(group.id)}/mutes`, {
    method: "POST",
    body: JSON.stringify({ memberId, muted }),
  });
  await refreshBootstrap();
  toast(muted ? "成员已禁言" : "成员已解除禁言");
}

async function leaveGroup() {
  const group = currentEntity();
  await api(`/api/groups/${encodeURIComponent(group.id)}/leave`, { method: "POST" });
  state.selected = null;
  await refreshBootstrap();
  toast("已退出群聊");
}

async function dissolveGroup() {
  const group = currentEntity();
  await api(`/api/groups/${encodeURIComponent(group.id)}`, { method: "DELETE" });
  state.selected = null;
  await refreshBootstrap();
  toast("群聊已解散");
}

function bindEvents() {
  els.showLogin.addEventListener("click", () => setAuthMode("login"));
  els.showRegister.addEventListener("click", () => setAuthMode("register"));
  els.loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const data = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ account: els.loginAccount.value, password: els.loginPassword.value }) });
      state.token = data.token;
      localStorage.setItem("flowlink_token", state.token);
      await enterWorkspace();
    } catch (error) {
      els.authMessage.textContent = error.message;
    }
  });
  els.registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const data = await api("/api/auth/register", { method: "POST", body: JSON.stringify({ displayName: els.registerName.value, username: els.registerUsername.value, email: els.registerEmail.value, password: els.registerPassword.value }) });
      els.loginAccount.value = data.user.username;
      els.loginPassword.value = els.registerPassword.value;
      setAuthMode("login");
      toast("注册成功");
    } catch (error) {
      els.authMessage.textContent = error.message;
    }
  });

  document.querySelectorAll(".rail-btn[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".rail-btn[data-tab]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      state.activeTab = button.dataset.tab;
      renderList();
      renderDetails();
    });
  });

  els.listView.addEventListener("click", async (event) => {
    const item = event.target.closest(".list-item");
    if (item) return selectConversation(item.dataset.type, item.dataset.id);
    if (event.target.closest("#openProfileBtn")) return renderProfilePanel();
    if (event.target.closest("#openSearchBtn")) return renderSearchPanel();
    const accept = event.target.closest("[data-accept]");
    const reject = event.target.closest("[data-reject]");
    if (accept || reject) {
      await api("/api/friends/respond", { method: "POST", body: JSON.stringify({ requestId: (accept || reject).dataset.accept || (accept || reject).dataset.reject, action: accept ? "accept" : "reject" }) });
      await refreshBootstrap();
    }
  });

  els.searchInput.addEventListener("input", renderList);
  els.newGroupBtn.addEventListener("click", renderCreateGroupPanel);
  els.detailsBtn.addEventListener("click", () => {
    els.detailsPane.classList.toggle("open");
    renderDetails();
  });
  els.closeDetailsBtn.addEventListener("click", () => els.detailsPane.classList.remove("open"));
  els.mobileBackBtn.addEventListener("click", () => els.workspaceView.classList.remove("chat-open"));

  els.sendBtn.addEventListener("click", () => sendMessage());
  els.messageInput.addEventListener("input", () => {
    resizeComposer();
    notifyTyping();
  });
  els.messageInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });
  els.messageList.addEventListener("click", (event) => {
    const recall = event.target.closest("[data-recall]");
    if (recall) recallMessage(recall.dataset.recall);
  });
  els.imageBtn.addEventListener("click", () => els.imageInput.click());
  els.imageInput.addEventListener("change", () => {
    const file = els.imageInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => sendMessage("image", reader.result, { fileName: file.name, fileSize: file.size, fileType: file.type || "image/*" });
    reader.readAsDataURL(file);
    els.imageInput.value = "";
  });
  els.fileBtn.addEventListener("click", () => els.fileInput.click());
  els.fileInput.addEventListener("change", () => {
    const file = els.fileInput.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      els.fileInput.value = "";
      toast("演示版文件不能超过 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      sendMessage("file", reader.result, {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || "application/octet-stream",
      });
    };
    reader.readAsDataURL(file);
    els.fileInput.value = "";
  });
  els.emojiPanel.innerHTML = emojis.map((emoji) => `<button type="button">${emoji}</button>`).join("");
  els.emojiBtn.addEventListener("click", () => els.emojiPanel.classList.toggle("hidden"));
  els.emojiPanel.addEventListener("click", (event) => {
    if (event.target.tagName !== "BUTTON") return;
    els.messageInput.value += event.target.textContent;
    els.emojiPanel.classList.add("hidden");
    els.messageInput.focus();
    resizeComposer();
  });

  els.detailsContent.addEventListener("click", async (event) => {
    const color = event.target.closest(".color-swatches button");
    if (color) {
      document.querySelectorAll(".color-swatches button").forEach((button) => button.classList.remove("selected"));
      color.classList.add("selected");
      return;
    }
    if (event.target.closest("#userSearchBtn")) return searchUsers();
    const addUser = event.target.closest("[data-add-user]");
    if (addUser) {
      await api("/api/friends/request", { method: "POST", body: JSON.stringify({ toId: addUser.dataset.addUser }) });
      await searchUsers();
      return toast("好友申请已发送");
    }
    if (event.target.closest("#inviteMembersBtn")) return inviteMembers();
    const muteButton = event.target.closest("[data-toggle-mute]");
    if (muteButton) return setMemberMute(muteButton.dataset.toggleMute, muteButton.dataset.muted === "true");
    const removeButton = event.target.closest("[data-remove-member]");
    if (removeButton) return removeMember(removeButton.dataset.removeMember);
    if (event.target.closest("#leaveGroupBtn")) return leaveGroup();
    if (event.target.closest("#dissolveGroupBtn")) return dissolveGroup();
  });
  els.detailsContent.addEventListener("submit", async (event) => {
    if (event.target.id === "profileForm") return saveProfile(event);
    if (event.target.id === "createGroupForm") return createGroup(event);
    if (event.target.id === "groupForm") return saveGroup(event);
  });

  els.logoutBtn.addEventListener("click", async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    localStorage.removeItem("flowlink_token");
    location.reload();
  });
}

bindEvents();

if (state.token) {
  enterWorkspace().catch(() => {
    localStorage.removeItem("flowlink_token");
    state.token = "";
    els.authView.classList.remove("hidden");
  });
}
