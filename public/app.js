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
  surface: "home",
  messages: [],
  ws: null,
  reconnectTimer: null,
  heartbeatTimer: null,
  typingTimer: null,
  remoteTypingTimer: null,
  pending: new Map(),
  groupMemberQuery: "",
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

const emojis = ["😀", "😂", "😊", "😍", "👍", "👏", "🎉", "🔥", "✨", "✅", "🙏", "💬", "🚀", "📌", "☕", "🌙"];
const colors = ["#07c160", "#2f80ed", "#7c3aed", "#f97316", "#0f766e", "#e11d48"];

const tabTitles = {
  chats: "聊天",
  contacts: "通讯录",
  requests: "申请",
  settings: "我的",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function avatarHtml(entity, sizeClass = "") {
  const itemAvatar = entity?.avatar || { text: "F", background: "#07c160" };
  if (itemAvatar.url) return `<div class="avatar ${sizeClass}"><img src="${escapeHtml(itemAvatar.url)}" alt="" /></div>`;
  return `<div class="avatar ${sizeClass}" style="background:${escapeHtml(itemAvatar.background || "#07c160")}">${escapeHtml(itemAvatar.text || "F")}</div>`;
}

function renderAvatarInto(element, entity) {
  const itemAvatar = entity?.avatar || { text: "F", background: "#07c160" };
  element.textContent = itemAvatar.text || "F";
  element.style.background = itemAvatar.background || "#07c160";
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
  applyBootstrap(data);
  els.authView.classList.add("hidden");
  els.workspaceView.classList.remove("hidden");
  connectWs();
  if (!state.selected && state.groups[0]) {
    await selectConversation("group", state.groups[0].id);
  } else {
    renderApp();
  }
}

async function refreshBootstrap() {
  const data = await api("/api/bootstrap");
  applyBootstrap(data);
  renderApp();
}

function applyBootstrap(data) {
  state.me = data.user;
  state.contacts = data.contacts || [];
  state.groups = data.groups || [];
  state.requests = data.requests || [];
  state.notifications = data.notifications || [];
  state.stats = data.stats || {};
  renderAvatarInto(els.meAvatar, state.me);
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
  if (action === "error") {
    toast(payload.message || "实时连接发生错误");
    return;
  }
  if (action === "message_ack") {
    const pending = state.pending.get(payload.clientId);
    if (pending) {
      pending.status = payload.status || "sent";
      pending.id = payload.messageId;
      renderMessages();
    }
    return;
  }
  if (action === "message_failed") {
    if (payload.clientId) state.pending.delete(payload.clientId);
    toast(payload.message || "消息发送失败");
    await refreshBootstrap();
    renderMessages();
    return;
  }
  if (action === "new_message") {
    const message = payload.message;
    updateConversationPreview(message);
    if (state.activeTab === "chats" && message.conversationId === state.selected?.conversationId) {
      upsertMessage(message);
      sendWs("read_conversation", selectedPayload());
    } else if (message.senderId !== state.me.id) {
      incrementUnread(message);
    }
    renderList();
    if (state.activeTab === "chats") renderMessages();
    return;
  }
  if (action === "message_recalled") {
    state.messages = state.messages.map((message) => (message.id === payload.messageId ? { ...message, status: "recalled" } : message));
    renderList();
    renderMessages();
    return;
  }
  if (action === "typing" && state.activeTab === "chats" && state.selected?.conversationId === payload.conversationId && payload.typing) {
    els.typingLine.textContent = `${payload.from.displayName} 正在输入`;
    clearTimeout(state.remoteTypingTimer);
    state.remoteTypingTimer = setTimeout(() => (els.typingLine.textContent = ""), 1800);
    return;
  }
  if (["presence", "friend_request", "friend_request_updated", "group_created", "group_updated", "group_dissolved"].includes(action)) {
    if (action === "group_dissolved" && state.selected?.id === payload.groupId) state.selected = null;
    await refreshBootstrap();
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

function isGroupManager(group, userId = state.me?.id) {
  return group?.ownerId === userId || group?.admins?.includes(userId);
}

function conversationItems() {
  return [...state.contacts, ...state.groups]
    .filter((item) => item.lastMessage)
    .sort((a, b) => new Date(b.lastMessage?.createdAt || 0) - new Date(a.lastMessage?.createdAt || 0));
}

function renderApp() {
  renderList();
  renderSurface();
  renderDetails();
}

function renderList() {
  els.sidebarTitle.textContent = tabTitles[state.activeTab] || "聊天";
  const keyword = els.searchInput.value.trim().toLowerCase();
  if (state.activeTab === "settings") return renderSettingsList();
  if (state.activeTab === "requests") return renderRequestsList();
  const source =
    state.activeTab === "contacts"
      ? [...state.groups, ...state.contacts].sort((a, b) => (a.name || a.displayName).localeCompare(b.name || b.displayName, "zh-CN"))
      : conversationItems();
  const filtered = source.filter((item) => !keyword || (item.name || item.displayName || "").toLowerCase().includes(keyword));
  els.listView.innerHTML = filtered.length
    ? filtered.map(renderListItem).join("")
    : `<div class="request-card empty-card">暂无内容</div>`;
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
          <article class="request-card compact-card" data-request-item="${request.id}">
            <div class="member-line">${avatarHtml(person)}<div><strong>${escapeHtml(person.displayName)}</strong><span>${escapeHtml(statusText(request.status))}</span></div></div>
            <p>${escapeHtml(request.message || "好友申请")}</p>
            ${!fromMe && request.status === "pending" ? `<div class="actions"><button class="small-action primary" data-accept="${request.id}">同意</button><button class="small-action danger" data-reject="${request.id}">拒绝</button></div>` : ""}
          </article>`;
      }).join("")
    : `<div class="request-card empty-card">暂无申请</div>`;
}

function statusText(status) {
  return ({ pending: "待处理", accepted: "已同意", rejected: "已拒绝" }[status] || status || "-");
}

function renderSettingsList() {
  els.listView.innerHTML = `
    <article class="request-card compact-card">
      <div class="member-line">${avatarHtml(state.me)}<div><strong>${escapeHtml(state.me.displayName)}</strong><span>${escapeHtml(state.me.username)}</span></div></div>
      <p>${escapeHtml(state.me.statusMessage || state.me.bio || "")}</p>
    </article>
    <article class="request-card compact-card">
      <button class="small-action primary" id="openProfileBtn">编辑资料</button>
      <button class="small-action" id="openSearchBtn">添加好友</button>
    </article>`;
}

function setActiveTab(tab) {
  state.activeTab = tab;
  state.surface = "home";
  state.groupMemberQuery = "";
  document.querySelectorAll(".rail-btn[data-tab]").forEach((item) => item.classList.toggle("active", item.dataset.tab === tab));
  if (tab !== "chats") els.workspaceView.classList.remove("chat-open");
  renderApp();
}

async function selectConversation(type, id) {
  const entity = type === "group" ? state.groups.find((item) => item.id === id) : state.contacts.find((item) => item.id === id);
  if (!entity) return;
  state.selected = { type, id, conversationId: entity.conversationId || id };
  entity.unread = 0;
  state.surface = "home";
  if (state.activeTab === "chats") {
    els.workspaceView.classList.add("chat-open");
    state.messages = await api(`/api/messages/history?type=${encodeURIComponent(type)}&targetId=${encodeURIComponent(id)}`);
    sendWs("read_conversation", selectedPayload());
  }
  renderApp();
}

function openChatFromDirectory(type, id) {
  setActiveTab("chats");
  selectConversation(type, id);
}

function renderSurface() {
  const pageMode = state.activeTab !== "chats" || !state.selected;
  els.workspaceView.classList.toggle("surface-mode", pageMode);
  els.messageList.classList.toggle("empty-state", false);
  els.messageList.classList.toggle("surface-list", pageMode);
  els.typingLine.textContent = "";
  if (state.activeTab === "chats") {
    if (!state.selected) return renderChatEmpty();
    renderChatHeader();
    renderMessages();
    syncComposerState();
    return;
  }
  if (state.surface === "createGroup") return renderCreateGroupSurface();
  if (state.surface === "search") return renderSearchSurface();
  if (state.activeTab === "contacts") return renderContactsSurface();
  if (state.activeTab === "requests") return renderRequestsSurface();
  if (state.activeTab === "settings") return renderProfileSurface();
}

function renderPageHeader(title, subtitle, entity = null) {
  renderAvatarInto(els.chatAvatar, entity || { avatar: { text: title[0] || "F", background: "#07c160" } });
  els.chatTitle.textContent = title;
  els.chatSubTitle.textContent = subtitle;
}

function renderChatEmpty() {
  renderPageHeader("FlowLink", "从左侧选择一个会话开始沟通");
  els.messageList.innerHTML = `<section class="surface-page welcome-page"><div class="empty-logo">F</div><h2>选择会话开始聊天</h2><p>消息、文件、图片、撤回和已读状态会在这里显示。</p></section>`;
  els.sendBtn.disabled = true;
}

function renderChatHeader() {
  const item = currentEntity();
  if (!item) return renderChatEmpty();
  renderAvatarInto(els.chatAvatar, item);
  els.chatTitle.textContent = item.name || item.displayName;
  els.chatSubTitle.textContent = state.selected.type === "group"
    ? `${item.members?.length || 0} 位成员 · ${item.notice || "暂无公告"}`
    : `${item.status === "online" ? "在线" : "离线"} · ${item.role || ""}`;
}

function renderMessages() {
  if (state.activeTab !== "chats") return;
  if (!state.selected) return renderChatEmpty();
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

function syncComposerState() {
  const muteReason = currentMuteReason();
  const blocked = Boolean(muteReason);
  els.messageInput.disabled = Boolean(blocked);
  els.sendBtn.disabled = Boolean(blocked);
  els.imageBtn.disabled = Boolean(blocked);
  els.fileBtn.disabled = Boolean(blocked);
  els.messageInput.placeholder = blocked ? currentMuteReason() : "输入消息，Enter 发送，Shift+Enter 换行";
  return;
  els.messageInput.placeholder = blocked ? muteReason : "输入消息，Enter 发送，Shift+Enter 换行";
  els.messageInput.placeholder = blocked ? "当前群聊已禁言，你暂时不能发言" : "输入消息，Enter 发送，Shift+Enter 换行";
}

function currentMuteReason() {
  const group = state.selected?.type === "group" ? currentEntity() : null;
  if (!group) return "";
  if ((group.mutedMembers || []).includes(state.me?.id)) return "你已被管理员禁言，暂时不能在该群聊发言";
  if (group.muteAll && !isGroupManager(group)) return "当前群聊已开启全员禁言，暂时不能发言";
  return "";
}

function isCurrentConversationMuted() {
  return Boolean(currentMuteReason());
}

async function sendMessage(messageType = "text", contentOverride = "", metadata = {}) {
  if (!state.selected || state.activeTab !== "chats") return toast("请先选择会话");
  if (isCurrentConversationMuted()) {
    syncComposerState();
    return toast("你已被禁言，暂时不能在该群聊发言");
  }
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
      state.pending.delete(clientId);
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
  if (!state.selected || state.activeTab !== "chats") return;
  sendWs("typing", { ...selectedPayload(), typing: true });
  clearTimeout(state.typingTimer);
  state.typingTimer = setTimeout(() => sendWs("typing", { ...selectedPayload(), typing: false }), 900);
}

async function recallMessage(messageId) {
  await api(`/api/messages/${encodeURIComponent(messageId)}/recall`, { method: "POST" });
}

function renderContactsSurface() {
  const item = currentEntity();
  if (item && state.selected?.type === "group") return renderGroupSurface(item);
  if (item && state.selected?.type === "private") return renderContactSurface(item);
  renderPageHeader("通讯录", "管理好友、群聊和新的连接", { avatar: { text: "通", background: "#2f80ed" } });
  els.messageList.innerHTML = `
    <section class="surface-page">
      <div class="surface-hero">
        <div><h2>联系人和群聊</h2><p>从左侧选择好友或群聊查看资料，也可以搜索用户、创建新的项目群。</p></div>
        <div class="hero-actions"><button class="small-action primary" data-open-search>添加好友</button><button class="small-action" data-create-group>创建群聊</button></div>
      </div>
      <div class="stat-grid surface-stats">
        <div><strong>${state.contacts.length}</strong><span>好友</span></div>
        <div><strong>${state.groups.length}</strong><span>群聊</span></div>
        <div><strong>${state.stats.online || 0}</strong><span>在线</span></div>
        <div><strong>${state.requests.filter((item) => item.status === "pending").length}</strong><span>待处理</span></div>
      </div>
      <div class="section-title"><strong>我的群聊</strong><span>${state.groups.length} 个</span></div>
      <div class="card-grid">${state.groups.map((group) => renderGroupCard(group)).join("") || "<p>暂无群聊</p>"}</div>
    </section>`;
}

function renderGroupCard(group) {
  return `
    <article class="mini-card" data-open-directory="group" data-id="${group.id}">
      ${avatarHtml(group)}
      <div><strong>${escapeHtml(group.name)}</strong><span>${group.members?.length || 0} 位成员 · ${group.muteAll ? "全员禁言" : "正常"}</span></div>
    </article>`;
}

function renderContactSurface(contact) {
  renderPageHeader(contact.displayName, contact.statusMessage || contact.role || "好友资料", contact);
  els.messageList.innerHTML = `
    <section class="surface-page">
      <div class="profile-shell">
        <div class="profile-cover big-cover">${avatarHtml(contact, "avatar-large")}<div><h2>${escapeHtml(contact.displayName)}</h2><span>${escapeHtml(contact.statusMessage || contact.role || "")}</span></div></div>
        <div class="info-grid">
          <div><span>账号</span><strong>${escapeHtml(contact.username)}</strong></div>
          <div><span>邮箱</span><strong>${escapeHtml(contact.email || "-")}</strong></div>
          <div><span>部门</span><strong>${escapeHtml(contact.department || "-")}</strong></div>
          <div><span>地区</span><strong>${escapeHtml(contact.location || "-")}</strong></div>
          <div><span>状态</span><strong>${contact.status === "online" ? "在线" : "离线"}</strong></div>
          <div><span>职责</span><strong>${escapeHtml(contact.role || "-")}</strong></div>
        </div>
        <p class="bio-block">${escapeHtml(contact.bio || "这个用户还没有填写简介。")}</p>
        <div class="surface-actions"><button class="small-action primary" data-open-chat="private" data-id="${contact.id}">发送消息</button></div>
      </div>
    </section>`;
}

function swatches(selected) {
  return `<div class="color-swatches">${colors.map((color) => `<button type="button" class="${selected === color ? "selected" : ""}" data-color="${color}" style="background:${color}" title="${color}"></button>`).join("")}</div>`;
}

function profileFormHtml() {
  return `
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
    </form>`;
}

function renderProfileSurface() {
  renderPageHeader("我的资料", "编辑个人信息、查看通知和系统统计", state.me);
  els.messageList.innerHTML = `
    <section class="surface-page">
      <div class="profile-shell">
        <div class="profile-cover big-cover">${avatarHtml(state.me, "avatar-large")}<div><h2>${escapeHtml(state.me.displayName)}</h2><span>${escapeHtml(state.me.statusMessage || "")}</span></div></div>
        <div class="stat-grid surface-stats">
          <div><strong>${state.stats.users || 0}</strong><span>用户</span></div>
          <div><strong>${state.stats.groups || 0}</strong><span>群聊</span></div>
          <div><strong>${state.stats.messages || 0}</strong><span>消息</span></div>
          <div><strong>${state.stats.files || 0}</strong><span>文件</span></div>
        </div>
        ${profileFormHtml()}
        <div class="section-title"><strong>通知</strong><span>${state.notifications.length} 条</span></div>
        <div class="notification-list">${state.notifications.length ? state.notifications.slice(0, 8).map((item) => `<p>${escapeHtml(item.content)}<span>${formatTime(item.createdAt)}</span></p>`).join("") : "<p>暂无通知</p>"}</div>
      </div>
    </section>`;
}

function renderSearchSurface() {
  renderPageHeader("添加好友", "按昵称、用户名或邮箱搜索 FlowLink 用户", { avatar: { text: "加", background: "#07c160" } });
  els.messageList.innerHTML = `
    <section class="surface-page">
      <div class="surface-hero">
        <div><h2>发现联系人</h2><p>输入关键词后发送好友申请，对方通过后即可私聊或邀请进群。</p></div>
      </div>
      <div class="search-surface">
        <input id="userSearchInput" placeholder="昵称 / 用户名 / 邮箱" />
        <button class="small-action primary" id="userSearchBtn">搜索用户</button>
      </div>
      <div id="userSearchResults" class="search-results"></div>
    </section>`;
}

function renderRequestsSurface() {
  renderPageHeader("好友申请", "处理收到的申请和查看申请状态", { avatar: { text: "申", background: "#f97316" } });
  const cards = state.requests.length
    ? state.requests.map((request) => {
        const fromMe = request.fromId === state.me.id;
        const person = fromMe ? request.to : request.from;
        return `
          <article class="wide-card">
            <div class="member-line">${avatarHtml(person)}<div><strong>${escapeHtml(person.displayName)}</strong><span>${fromMe ? "我发送的申请" : "收到的申请"} · ${escapeHtml(statusText(request.status))}</span></div></div>
            <p>${escapeHtml(request.message || "好友申请")}</p>
            ${!fromMe && request.status === "pending" ? `<div class="actions"><button class="small-action primary" data-accept="${request.id}">同意</button><button class="small-action danger" data-reject="${request.id}">拒绝</button></div>` : ""}
          </article>`;
      }).join("")
    : `<div class="wide-card"><strong>暂无申请</strong><p>新的好友申请会显示在这里。</p></div>`;
  els.messageList.innerHTML = `<section class="surface-page"><div class="wide-list">${cards}</div></section>`;
}

function renderCreateGroupSurface() {
  renderPageHeader("创建群聊", "选择好友并设置群资料", { avatar: { text: "群", background: "#07c160" } });
  els.messageList.innerHTML = `
    <section class="surface-page">
      <form class="panel-form create-group-form" id="createGroupForm">
        <div class="form-band">
          <label><span>群名称</span><input id="groupNameInput" maxlength="40" placeholder="例如：产品联调小组" /></label>
          <label><span>群公告</span><textarea id="groupNoticeInput" maxlength="160" rows="3" placeholder="写一句群公告"></textarea></label>
          <label><span>群介绍</span><textarea id="groupDescriptionInput" maxlength="200" rows="3" placeholder="群聊用途、规则或说明"></textarea></label>
          ${swatches("#07c160")}
        </div>
        <div class="section-title"><strong>选择成员</strong><span>${state.contacts.length} 位好友</span></div>
        <div class="select-grid">${state.contacts.map((contact) => renderSelectTile(contact)).join("") || "<p>暂无可选择好友</p>"}</div>
        <button class="small-action primary" type="submit">创建群聊</button>
      </form>
    </section>`;
}

function renderSelectTile(contact) {
  return `
    <label class="select-tile">
      <input type="checkbox" value="${contact.id}" />
      ${avatarHtml(contact)}
      <span>${escapeHtml(contact.displayName)}</span>
      <small>${escapeHtml(contact.role || contact.username)}</small>
    </label>`;
}

function renderGroupSurface(group) {
  const canManage = isGroupManager(group);
  const isOwner = group.ownerId === state.me.id;
  const candidates = state.contacts.filter((contact) => !group.memberIds.includes(contact.id));
  const query = state.groupMemberQuery.trim().toLowerCase();
  const members = (group.members || []).filter((member) => !query || `${member.displayName} ${member.username} ${member.role || ""}`.toLowerCase().includes(query));
  renderPageHeader(group.name, `${group.members?.length || 0} 位成员 · ${group.muteAll ? "全员禁言" : group.notice || "暂无公告"}`, group);
  els.messageList.innerHTML = `
    <section class="surface-page">
      <div class="group-dashboard">
        <div class="profile-cover big-cover">
          ${avatarHtml(group, "avatar-large")}
          <div><h2>${escapeHtml(group.name)}</h2><span>${group.members?.length || 0} 位成员 · ${group.muteAll ? "全员禁言" : "正常发言"}</span></div>
          <button class="small-action primary" data-open-chat="group" data-id="${group.id}">进入聊天</button>
        </div>
        <form class="panel-form group-form" id="groupForm">
          <label><span>群名称</span><input id="groupNameEdit" maxlength="40" value="${escapeHtml(group.name)}" ${canManage ? "" : "disabled"} /></label>
          <label><span>群公告</span><textarea id="groupNoticeEdit" maxlength="160" rows="3" ${canManage ? "" : "disabled"}>${escapeHtml(group.notice || "")}</textarea></label>
          <label><span>群介绍</span><textarea id="groupDescriptionEdit" maxlength="200" rows="3" ${canManage ? "" : "disabled"}>${escapeHtml(group.description || "")}</textarea></label>
          <label class="toggle-line"><input id="groupMutedEdit" type="checkbox" ${group.muted ? "checked" : ""} ${canManage ? "" : "disabled"} /> 群消息免打扰</label>
          <label class="toggle-line"><input id="groupMuteAllEdit" type="checkbox" ${group.muteAll ? "checked" : ""} ${canManage ? "" : "disabled"} /> 全员禁言（管理员可发言）</label>
          ${canManage ? `<div>${swatches(group.avatar?.background)}</div><button class="small-action primary" type="submit">保存群资料</button>` : ""}
        </form>
        ${canManage ? `
          <section class="group-section">
            <div class="section-title"><strong>邀请好友</strong><span>${candidates.length} 位可邀请</span></div>
            <div class="select-grid compact">${candidates.length ? candidates.map((contact) => renderSelectTile(contact)).join("") : "<p>暂无可邀请好友</p>"}</div>
            <button class="small-action primary" id="inviteMembersBtn">邀请入群</button>
          </section>` : ""}
        <section class="group-section">
          <div class="section-title"><strong>成员管理</strong><span>${members.length}/${group.members?.length || 0}</span></div>
          <input class="member-filter" id="groupMemberFilter" placeholder="搜索成员" value="${escapeHtml(state.groupMemberQuery)}" />
          <div class="member-list">${members.map((member) => renderMemberLine(group, member, canManage, isOwner)).join("")}</div>
        </section>
        <div class="danger-zone">
          ${isOwner ? `<button class="small-action danger" id="dissolveGroupBtn">解散群聊</button>` : `<button class="small-action danger" id="leaveGroupBtn">退出群聊</button>`}
        </div>
      </div>
    </section>`;
}

function renderMemberLine(group, member, canManage, isOwner) {
  const owner = group.ownerId === member.id;
  const admin = group.admins?.includes(member.id);
  const role = owner ? "群主" : admin ? "管理员" : member.role || "成员";
  const removable = canManage && member.id !== state.me.id && !owner;
  const muted = group.mutedMembers?.includes(member.id);
  const mutable = canManage && !owner && !(admin && !isOwner && member.id !== state.me.id);
  const canAdmin = isOwner && !owner && member.id !== state.me.id;
  const canTransfer = isOwner && !owner;
  return `
    <div class="member-line member-row">
      ${avatarHtml(member)}
      <div><strong>${escapeHtml(member.displayName)}</strong><span>${escapeHtml(role)}${muted ? " · 已禁言" : ""}</span></div>
      <div class="member-actions">
        ${canAdmin ? `<button class="small-action" data-set-admin="${member.id}" data-admin="${admin ? "false" : "true"}">${admin ? "取消管理员" : "设为管理员"}</button>` : ""}
        ${mutable ? `<button class="small-action" data-toggle-mute="${member.id}" data-muted="${muted ? "false" : "true"}">${muted ? "解除禁言" : "禁言"}</button>` : ""}
        ${canTransfer ? `<button class="small-action" data-transfer-owner="${member.id}">转让群主</button>` : ""}
        ${removable ? `<button class="small-action danger" data-remove-member="${member.id}">移除</button>` : ""}
      </div>
    </div>`;
}

function renderDetails() {
  if (state.activeTab === "chats" && state.selected) {
    const entity = currentEntity();
    if (!entity) return;
    if (state.selected.type === "group") {
      els.detailsContent.innerHTML = `
        <div class="profile-card">
          <div class="profile-cover">${avatarHtml(entity, "avatar-large")}<div><h3>${escapeHtml(entity.name)}</h3><span>${entity.members?.length || 0} 位成员</span></div></div>
          <p>${escapeHtml(entity.notice || "暂无公告")}</p>
          <button class="small-action primary" data-open-directory="group" data-id="${entity.id}">管理群聊</button>
          <div class="member-list mini-members">${entity.members.slice(0, 8).map((member) => `<div class="member-line">${avatarHtml(member)}<div><strong>${escapeHtml(member.displayName)}</strong><span>${escapeHtml(member.role || member.username)}</span></div></div>`).join("")}</div>
        </div>`;
    } else {
      els.detailsContent.innerHTML = renderContactAside(entity);
    }
    return;
  }
  els.detailsContent.innerHTML = `
    <div class="profile-card">
      <strong>工作台</strong>
      <p>当前在 ${tabTitles[state.activeTab] || "页面"}。主区域会随左侧导航切换，不再停留在聊天输入界面。</p>
      <div class="stat-grid">
        <div><strong>${state.contacts.length}</strong><span>好友</span></div>
        <div><strong>${state.groups.length}</strong><span>群聊</span></div>
      </div>
    </div>`;
}

function renderContactAside(entity) {
  return `
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
  renderApp();
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
  const memberIds = [...document.querySelectorAll("#createGroupForm .select-tile input:checked")].map((input) => input.value);
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
  setActiveTab("contacts");
  state.selected = { type: "group", id: group.id, conversationId: group.id };
  renderApp();
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
  const memberIds = [...document.querySelectorAll(".group-dashboard .select-tile input:checked")].map((input) => input.value);
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

async function setMemberAdmin(memberId, admin) {
  const group = currentEntity();
  await api(`/api/groups/${encodeURIComponent(group.id)}/admins`, {
    method: "POST",
    body: JSON.stringify({ memberId, admin }),
  });
  await refreshBootstrap();
  toast(admin ? "已设为管理员" : "已取消管理员");
}

async function transferOwner(memberId) {
  const group = currentEntity();
  await api(`/api/groups/${encodeURIComponent(group.id)}/owner`, {
    method: "POST",
    body: JSON.stringify({ memberId }),
  });
  await refreshBootstrap();
  toast("群主已转让");
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

function handlePanelClick(event) {
  const color = event.target.closest(".color-swatches button");
  if (color) {
    document.querySelectorAll(".color-swatches button").forEach((button) => button.classList.remove("selected"));
    color.classList.add("selected");
    return true;
  }
  const openChat = event.target.closest("[data-open-chat]");
  if (openChat) {
    openChatFromDirectory(openChat.dataset.openChat, openChat.dataset.id);
    return true;
  }
  const openDirectory = event.target.closest("[data-open-directory]");
  if (openDirectory) {
    setActiveTab("contacts");
    state.selected = { type: openDirectory.dataset.openDirectory, id: openDirectory.dataset.id, conversationId: openDirectory.dataset.id };
    renderApp();
    return true;
  }
  if (event.target.closest("[data-open-search]")) {
    state.surface = "search";
    renderApp();
    return true;
  }
  if (event.target.closest("[data-create-group]")) {
    state.surface = "createGroup";
    renderApp();
    return true;
  }
  if (event.target.closest("#userSearchBtn")) {
    searchUsers();
    return true;
  }
  const addUser = event.target.closest("[data-add-user]");
  if (addUser) {
    api("/api/friends/request", { method: "POST", body: JSON.stringify({ toId: addUser.dataset.addUser }) })
      .then(searchUsers)
      .then(() => toast("好友申请已发送"))
      .catch((error) => toast(error.message));
    return true;
  }
  if (event.target.closest("#inviteMembersBtn")) {
    inviteMembers().catch((error) => toast(error.message));
    return true;
  }
  const adminButton = event.target.closest("[data-set-admin]");
  if (adminButton) {
    setMemberAdmin(adminButton.dataset.setAdmin, adminButton.dataset.admin === "true").catch((error) => toast(error.message));
    return true;
  }
  const muteButton = event.target.closest("[data-toggle-mute]");
  if (muteButton) {
    setMemberMute(muteButton.dataset.toggleMute, muteButton.dataset.muted === "true").catch((error) => toast(error.message));
    return true;
  }
  const transferButton = event.target.closest("[data-transfer-owner]");
  if (transferButton) {
    transferOwner(transferButton.dataset.transferOwner).catch((error) => toast(error.message));
    return true;
  }
  const removeButton = event.target.closest("[data-remove-member]");
  if (removeButton) {
    removeMember(removeButton.dataset.removeMember).catch((error) => toast(error.message));
    return true;
  }
  if (event.target.closest("#leaveGroupBtn")) {
    leaveGroup().catch((error) => toast(error.message));
    return true;
  }
  if (event.target.closest("#dissolveGroupBtn")) {
    dissolveGroup().catch((error) => toast(error.message));
    return true;
  }
  return false;
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
    button.addEventListener("click", () => setActiveTab(button.dataset.tab));
  });

  els.listView.addEventListener("click", async (event) => {
    const item = event.target.closest(".list-item");
    if (item) return selectConversation(item.dataset.type, item.dataset.id);
    if (event.target.closest("#openProfileBtn")) {
      setActiveTab("settings");
      return;
    }
    if (event.target.closest("#openSearchBtn")) {
      state.surface = "search";
      renderApp();
      return;
    }
    const accept = event.target.closest("[data-accept]");
    const reject = event.target.closest("[data-reject]");
    if (accept || reject) {
      await api("/api/friends/respond", { method: "POST", body: JSON.stringify({ requestId: (accept || reject).dataset.accept || (accept || reject).dataset.reject, action: accept ? "accept" : "reject" }) });
      await refreshBootstrap();
    }
  });

  els.searchInput.addEventListener("input", renderList);
  els.newGroupBtn.addEventListener("click", () => {
    setActiveTab("contacts");
    state.surface = "createGroup";
    renderApp();
  });
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
    if (recall) return recallMessage(recall.dataset.recall);
    handlePanelClick(event);
  });
  els.messageList.addEventListener("input", (event) => {
    if (event.target.id === "groupMemberFilter") {
      state.groupMemberQuery = event.target.value;
      renderGroupSurface(currentEntity());
    }
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

  els.detailsContent.addEventListener("click", (event) => {
    handlePanelClick(event);
  });
  els.messageList.addEventListener("submit", async (event) => {
    if (event.target.id === "profileForm") return saveProfile(event);
    if (event.target.id === "createGroupForm") return createGroup(event);
    if (event.target.id === "groupForm") return saveGroup(event);
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
      // ignore logout failures
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
