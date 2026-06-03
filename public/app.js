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

const els = {
  authView: document.querySelector("#authView"),
  workspaceView: document.querySelector("#workspaceView"),
  loginForm: document.querySelector("#loginForm"),
  registerForm: document.querySelector("#registerForm"),
  showLogin: document.querySelector("#showLogin"),
  showRegister: document.querySelector("#showRegister"),
  authMessage: document.querySelector("#authMessage"),
  loginAccount: document.querySelector("#loginAccount"),
  loginPassword: document.querySelector("#loginPassword"),
  registerName: document.querySelector("#registerName"),
  registerUsername: document.querySelector("#registerUsername"),
  registerEmail: document.querySelector("#registerEmail"),
  registerPassword: document.querySelector("#registerPassword"),
  meAvatar: document.querySelector("#meAvatar"),
  sidebarTitle: document.querySelector("#sidebarTitle"),
  connectionText: document.querySelector("#connectionText"),
  listView: document.querySelector("#listView"),
  searchInput: document.querySelector("#searchInput"),
  chatAvatar: document.querySelector("#chatAvatar"),
  chatTitle: document.querySelector("#chatTitle"),
  chatSubTitle: document.querySelector("#chatSubTitle"),
  messageList: document.querySelector("#messageList"),
  typingLine: document.querySelector("#typingLine"),
  messageInput: document.querySelector("#messageInput"),
  sendBtn: document.querySelector("#sendBtn"),
  imageBtn: document.querySelector("#imageBtn"),
  imageInput: document.querySelector("#imageInput"),
  emojiBtn: document.querySelector("#emojiBtn"),
  emojiPanel: document.querySelector("#emojiPanel"),
  detailsBtn: document.querySelector("#detailsBtn"),
  detailsPane: document.querySelector("#detailsPane"),
  detailsContent: document.querySelector("#detailsContent"),
  closeDetailsBtn: document.querySelector("#closeDetailsBtn"),
  newGroupBtn: document.querySelector("#newGroupBtn"),
  logoutBtn: document.querySelector("#logoutBtn"),
  mobileBackBtn: document.querySelector("#mobileBackBtn"),
  toast: document.querySelector("#toast"),
};

const emojis = ["😀", "😂", "😊", "😍", "👍", "👏", "🎉", "🔥", "💡", "✅", "🙏", "💬", "🚀", "📌", "☕", "🌙"];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function avatarHtml(entity, sizeClass = "") {
  const avatar = entity?.avatar || { text: "F", background: "#07c160" };
  if (avatar.url) {
    return `<div class="avatar ${sizeClass}"><img src="${escapeHtml(avatar.url)}" alt="" /></div>`;
  }
  return `<div class="avatar ${sizeClass}" style="background:${escapeHtml(avatar.background || "#07c160")}">${escapeHtml(avatar.text || "F")}</div>`;
}

function formatTime(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return sameDay
    ? date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
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
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || "请求失败");
  }
  return payload.data;
}

function setAuthMode(mode) {
  const login = mode === "login";
  els.loginForm.classList.toggle("hidden", !login);
  els.registerForm.classList.toggle("hidden", login);
  els.showLogin.classList.toggle("active", login);
  els.showRegister.classList.toggle("active", !login);
  els.authMessage.textContent = "";
}

async function login(account, password) {
  const data = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ account, password }),
  });
  state.token = data.token;
  localStorage.setItem("flowlink_token", state.token);
  await enterWorkspace();
}

async function register() {
  const data = await api("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      displayName: els.registerName.value.trim(),
      username: els.registerUsername.value.trim(),
      email: els.registerEmail.value.trim(),
      password: els.registerPassword.value,
    }),
  });
  els.loginAccount.value = data.user.username;
  els.loginPassword.value = els.registerPassword.value;
  setAuthMode("login");
  toast("注册成功");
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
  if (!state.selected) {
    const firstGroup = state.groups[0];
    if (firstGroup) selectConversation("group", firstGroup.id);
  }
}

function renderAvatarInto(element, entity) {
  const avatar = entity?.avatar || { text: "F", background: "#07c160" };
  element.textContent = avatar.text || "F";
  element.style.background = avatar.background || "#07c160";
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

  ws.addEventListener("message", async (event) => {
    const packet = JSON.parse(event.data);
    await handleWs(packet);
  });

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
    upsertMessage(message);
    updateConversationPreview(message);
    if (isCurrentMessage(message)) {
      sendWs("read_conversation", selectedPayload());
    } else if (message.senderId !== state.me.id) {
      incrementUnread(message);
    }
    renderList();
    renderMessages();
    return;
  }

  if (action === "message_recalled") {
    state.messages = state.messages.map((message) =>
      message.id === payload.messageId ? { ...message, status: "recalled" } : message
    );
    for (const collection of [state.contacts, state.groups]) {
      const target = collection.find((item) => item.conversationId === payload.conversationId);
      if (target?.lastMessage?.id === payload.messageId) target.lastMessage.status = "recalled";
    }
    renderList();
    renderMessages();
    return;
  }

  if (action === "typing") {
    if (state.selected?.conversationId === payload.conversationId && payload.typing) {
      els.typingLine.textContent = `${payload.from.displayName} 正在输入`;
      clearTimeout(state.remoteTypingTimer);
      state.remoteTypingTimer = setTimeout(() => (els.typingLine.textContent = ""), 1800);
    }
    return;
  }

  if (action === "presence") {
    updateUserPresence(payload.user);
    renderList();
    renderDetails();
    return;
  }

  if (action === "read_receipt") {
    if (state.selected?.conversationId === payload.conversationId && payload.readerId !== state.me.id) {
      state.messages = state.messages.map((message) =>
        message.senderId === state.me.id ? { ...message, statusLabel: "已读" } : message
      );
      renderMessages();
    }
    return;
  }

  if (action === "friend_request" || action === "friend_request_updated" || action === "group_created") {
    await refreshBootstrap();
    toast(action === "group_created" ? "群聊已更新" : "好友申请已更新");
  }
}

function upsertMessage(message) {
  const existingIndex = state.messages.findIndex((item) => item.id === message.id);
  if (existingIndex >= 0) {
    state.messages[existingIndex] = message;
  } else if (isCurrentMessage(message)) {
    state.messages.push(message);
  }
  if (message.senderId === state.me.id) {
    for (const [clientId, pending] of state.pending) {
      if (pending.content === message.content && pending.conversationId === message.conversationId) {
        state.pending.delete(clientId);
      }
    }
  }
}

function isCurrentMessage(message) {
  return state.selected && message.conversationId === state.selected.conversationId;
}

function updateConversationPreview(message) {
  const collection = message.conversationType === "group" ? state.groups : state.contacts;
  const target = collection.find((item) => item.conversationId === message.conversationId);
  if (target) target.lastMessage = message;
}

function incrementUnread(message) {
  const collection = message.conversationType === "group" ? state.groups : state.contacts;
  const target = collection.find((item) => item.conversationId === message.conversationId);
  if (target) target.unread = (target.unread || 0) + 1;
}

function updateUserPresence(user) {
  for (const item of state.contacts) {
    if (item.id === user.id) item.status = user.status;
  }
  for (const group of state.groups) {
    for (const member of group.members || []) {
      if (member.id === user.id) member.status = user.status;
    }
  }
}

async function refreshBootstrap() {
  const data = await api("/api/bootstrap");
  state.me = data.user;
  state.contacts = data.contacts;
  state.groups = data.groups;
  state.requests = data.requests;
  state.notifications = data.notifications || [];
  state.stats = data.stats || {};
  renderList();
  renderDetails();
}

function selectedPayload() {
  return {
    conversationType: state.selected.type,
    targetId: state.selected.id,
  };
}

function conversationCollections() {
  const chats = [...state.contacts, ...state.groups]
    .filter((item) => item.lastMessage)
    .sort((a, b) => new Date(b.lastMessage?.createdAt || 0) - new Date(a.lastMessage?.createdAt || 0));
  return {
    chats,
    contacts: state.contacts.sort((a, b) => a.displayName.localeCompare(b.displayName, "zh-CN")),
    groups: state.groups,
  };
}

function renderList() {
  const titleMap = { chats: "聊天", contacts: "联系人", requests: "申请", settings: "资料" };
  els.sidebarTitle.textContent = titleMap[state.activeTab] || "聊天";
  const q = els.searchInput.value.trim().toLowerCase();

  if (state.activeTab === "settings") {
    renderSettingsList();
    return;
  }

  if (state.activeTab === "requests") {
    renderRequestsList();
    return;
  }

  const collections = conversationCollections();
  const source = state.activeTab === "contacts" ? [...collections.contacts, ...collections.groups] : collections.chats;
  const filtered = source.filter((item) => {
    const label = item.name || item.displayName || "";
    return !q || label.toLowerCase().includes(q);
  });

  if (!filtered.length) {
    els.listView.innerHTML = `<div class="request-card">暂无内容</div>`;
    return;
  }

  els.listView.innerHTML = filtered
    .map((item) => {
      const type = item.conversationType || (item.memberIds ? "group" : "private");
      const targetId = item.id;
      const active = state.selected?.type === type && state.selected?.id === targetId ? "active" : "";
      const title = item.name || item.displayName;
      const last = previewText(item.lastMessage);
      const online = type === "private" && item.status === "online" ? "online" : "";
      return `
        <article class="list-item ${active}" data-type="${type}" data-id="${targetId}">
          ${avatarHtml(item)}
          <div class="list-item-main">
            <div class="list-item-title">
              <span>${escapeHtml(title)}</span>
              <span class="list-item-time">${formatTime(item.lastMessage?.createdAt)}</span>
            </div>
            <div class="list-item-preview">${escapeHtml(last || (type === "group" ? "群聊" : item.role || ""))}</div>
          </div>
          <div>${item.unread ? `<span class="badge">${item.unread}</span>` : `<span class="status-dot ${online}"></span>`}</div>
        </article>`;
    })
    .join("");
}

function previewText(message) {
  if (!message) return "";
  if (message.status === "recalled") return "消息已撤回";
  if (message.messageType === "image") return "[图片]";
  return message.content || "";
}

function renderRequestsList() {
  const visible = state.requests.filter((request) => request.status === "pending");
  const items = visible.length ? visible : state.requests.slice(0, 8);
  els.listView.innerHTML = items.length
    ? items
        .map((request) => {
          const fromMe = request.fromId === state.me.id;
          const person = fromMe ? request.to : request.from;
          return `
            <article class="request-card">
              <div class="member-line">
                ${avatarHtml(person)}
                <div>
                  <strong>${escapeHtml(person.displayName)}</strong>
                  <span>${escapeHtml(request.status)}</span>
                </div>
              </div>
              <p>${escapeHtml(request.message || "好友申请")}</p>
              ${
                !fromMe && request.status === "pending"
                  ? `<div class="actions">
                      <button class="small-action primary" data-accept="${request.id}">同意</button>
                      <button class="small-action danger" data-reject="${request.id}">拒绝</button>
                    </div>`
                  : ""
              }
            </article>`;
        })
        .join("")
    : `<div class="request-card">暂无申请</div>`;
}

function renderSettingsList() {
  els.listView.innerHTML = `
    <article class="request-card">
      <div class="member-line">
        ${avatarHtml(state.me)}
        <div>
          <strong>${escapeHtml(state.me.displayName)}</strong>
          <span>${escapeHtml(state.me.username)}</span>
        </div>
      </div>
      <p>${escapeHtml(state.me.bio || "")}</p>
    </article>
    <article class="request-card">
      <button class="small-action primary" id="openProfileBtn">编辑资料</button>
      <button class="small-action primary" id="openSearchBtn">添加好友</button>
    </article>`;
}

async function selectConversation(type, id) {
  const entity = type === "group" ? state.groups.find((item) => item.id === id) : state.contacts.find((item) => item.id === id);
  if (!entity) return;
  state.selected = {
    type,
    id,
    conversationId: entity.conversationId || (type === "group" ? id : privateConversationId(state.me.id, id)),
  };
  entity.unread = 0;
  els.workspaceView.classList.add("chat-open");
  els.messageList.classList.remove("empty-state");
  renderChatHeader();
  renderList();
  renderDetails();
  state.messages = await api(`/api/messages/history?type=${encodeURIComponent(type)}&targetId=${encodeURIComponent(id)}`);
  renderMessages();
  sendWs("read_conversation", selectedPayload());
}

function privateConversationId(a, b) {
  return `p:${[a, b].sort().join(":")}`;
}

function renderChatHeader() {
  const item = currentEntity();
  if (!item) return;
  renderAvatarInto(els.chatAvatar, item);
  els.chatTitle.textContent = item.name || item.displayName;
  if (state.selected.type === "group") {
    els.chatSubTitle.textContent = `${item.members?.length || item.memberIds?.length || 0} 位成员`;
  } else {
    els.chatSubTitle.textContent = item.status === "online" ? "在线" : item.role || "离线";
  }
}

function currentEntity() {
  if (!state.selected) return null;
  return state.selected.type === "group"
    ? state.groups.find((item) => item.id === state.selected.id)
    : state.contacts.find((item) => item.id === state.selected.id);
}

function renderMessages() {
  if (!state.selected) return;
  const pendingMessages = [...state.pending.values()].filter((item) => item.conversationId === state.selected.conversationId);
  const all = [...state.messages, ...pendingMessages].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
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
  const sender = message.sender || (mine ? state.me : findUser(message.senderId));
  const canRecall =
    mine &&
    message.id &&
    !message.id.startsWith("local_") &&
    message.status !== "recalled" &&
    Date.now() - new Date(message.createdAt).getTime() < 2 * 60 * 1000;
  const content =
    message.status === "recalled"
      ? `<div class="bubble recalled">消息已撤回</div>`
      : message.messageType === "image"
        ? `<div class="bubble image-bubble"><img src="${escapeHtml(message.content)}" alt="聊天图片" /></div>`
        : `<div class="bubble">${escapeHtml(message.content).replaceAll("\n", "<br />")}</div>`;
  return `
    <article class="message-row ${mine ? "mine" : ""}" data-message-id="${escapeHtml(message.id || "")}">
      ${avatarHtml(sender)}
      <div class="message-body">
        <div class="message-meta">${escapeHtml(sender?.displayName || "")} · ${formatTime(message.createdAt)}</div>
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
  return { displayName: "成员", avatar: { text: "F", background: "#64748b" } };
}

async function sendMessage(messageType = "text", contentOverride = "") {
  if (!state.selected) return toast("请先选择会话");
  const content = contentOverride || els.messageInput.value.trim();
  if (!content) return;
  const clientId = `local_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const localMessage = {
    id: clientId,
    clientId,
    conversationType: state.selected.type,
    conversationId: state.selected.conversationId,
    senderId: state.me.id,
    sender: state.me,
    content,
    messageType,
    status: "sending",
    statusLabel: "发送中",
    createdAt: new Date().toISOString(),
  };
  state.pending.set(clientId, localMessage);
  els.messageInput.value = "";
  resizeComposer();
  renderMessages();
  const sent = sendWs("send_message", {
    ...selectedPayload(),
    messageType,
    content,
    clientId,
  });
  if (!sent) {
    try {
      const saved = await api("/api/messages/send", {
        method: "POST",
        body: JSON.stringify({ ...selectedPayload(), messageType, content, clientId }),
      });
      state.pending.delete(clientId);
      upsertMessage(saved);
      renderMessages();
      renderList();
    } catch (error) {
      localMessage.status = "failed";
      localMessage.statusLabel = "发送失败";
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
    state.messages = state.messages.map((message) =>
      message.id === messageId ? { ...message, status: "recalled" } : message
    );
    renderMessages();
    renderList();
  } catch (error) {
    toast(error.message);
  }
}

function renderDetails() {
  if (state.activeTab === "settings") {
    renderProfilePanel();
    return;
  }
  const entity = currentEntity();
  if (!entity) {
    els.detailsContent.innerHTML = `<div class="profile-card"><p>FlowLink</p></div>`;
    return;
  }
  if (state.selected.type === "group") {
    els.detailsContent.innerHTML = `
      <div class="profile-card">
        <div class="profile-head">
          ${avatarHtml(entity, "avatar-large")}
          <div>
            <h3>${escapeHtml(entity.name)}</h3>
            <span>${entity.members?.length || 0} 位成员</span>
          </div>
        </div>
        <p>${escapeHtml(entity.notice || "")}</p>
        <strong>成员</strong>
        <div class="member-list">
          ${(entity.members || [])
            .map(
              (member) => `
                <div class="member-line">
                  ${avatarHtml(member)}
                  <div><strong>${escapeHtml(member.displayName)}</strong><span>${escapeHtml(member.role || "")}</span></div>
                </div>`
            )
            .join("")}
        </div>
      </div>`;
    return;
  }
  els.detailsContent.innerHTML = `
    <div class="profile-card">
      <div class="profile-head">
        ${avatarHtml(entity, "avatar-large")}
        <div>
          <h3>${escapeHtml(entity.displayName)}</h3>
          <span>${escapeHtml(entity.status === "online" ? "在线" : "离线")}</span>
        </div>
      </div>
      <p>${escapeHtml(entity.role || "")}</p>
      <p>${escapeHtml(entity.bio || "")}</p>
    </div>`;
}

function renderProfilePanel() {
  const colors = ["#07c160", "#2f80ed", "#7c3aed", "#f97316", "#0f766e", "#e11d48"];
  els.detailsContent.innerHTML = `
    <div class="profile-card">
      <div class="profile-head">
        ${avatarHtml(state.me, "avatar-large")}
        <div>
          <h3>${escapeHtml(state.me.displayName)}</h3>
          <span>${escapeHtml(state.me.email)}</span>
        </div>
      </div>
      <div class="stat-grid">
        <div><strong>${state.stats.users || 0}</strong><span>用户</span></div>
        <div><strong>${state.stats.groups || 0}</strong><span>群聊</span></div>
        <div><strong>${state.stats.messages || 0}</strong><span>消息</span></div>
        <div><strong>${state.stats.online || 0}</strong><span>在线</span></div>
      </div>
      <form class="panel-form" id="profileForm">
        <input id="profileName" maxlength="20" value="${escapeHtml(state.me.displayName)}" />
        <input id="profileRole" maxlength="30" value="${escapeHtml(state.me.role || "")}" />
        <textarea id="profileBio" maxlength="120" rows="3">${escapeHtml(state.me.bio || "")}</textarea>
        <div class="color-swatches">
          ${colors
            .map(
              (color) =>
                `<button type="button" class="${state.me.avatar?.background === color ? "selected" : ""}" data-color="${color}" style="background:${color}" title="${color}"></button>`
            )
            .join("")}
        </div>
        <button class="small-action primary" type="submit">保存资料</button>
      </form>
      <strong>通知</strong>
      <div class="notification-list">
        ${
          state.notifications.length
            ? state.notifications
                .slice(0, 8)
                .map((item) => `<p>${escapeHtml(item.content)}<span>${formatTime(item.createdAt)}</span></p>`)
                .join("")
            : "<p>暂无通知</p>"
        }
      </div>
    </div>`;
}

function renderSearchPanel() {
  els.detailsContent.innerHTML = `
    <div class="panel-form">
      <input id="userSearchInput" placeholder="昵称 / 用户名 / 邮箱" />
      <button class="small-action primary" id="userSearchBtn">搜索用户</button>
    </div>
    <div id="userSearchResults"></div>`;
}

async function saveProfile(event) {
  event.preventDefault();
  const selectedColor = document.querySelector(".color-swatches button.selected")?.dataset.color || state.me.avatar?.background;
  try {
    const user = await api("/api/me", {
      method: "PATCH",
      body: JSON.stringify({
        displayName: document.querySelector("#profileName").value.trim(),
        role: document.querySelector("#profileRole").value.trim(),
        bio: document.querySelector("#profileBio").value.trim(),
        avatarColor: selectedColor,
      }),
    });
    state.me = user;
    renderAvatarInto(els.meAvatar, state.me);
    renderList();
    renderProfilePanel();
    toast("资料已保存");
  } catch (error) {
    toast(error.message);
  }
}

async function searchUsers() {
  const input = document.querySelector("#userSearchInput");
  const output = document.querySelector("#userSearchResults");
  const users = await api(`/api/users?q=${encodeURIComponent(input.value.trim())}`);
  output.innerHTML = users.length
    ? users
        .map(
          (user) => `
          <article class="search-result">
            <div class="member-line">
              ${avatarHtml(user)}
              <div><strong>${escapeHtml(user.displayName)}</strong><span>${escapeHtml(user.username)}</span></div>
            </div>
            <div class="actions">
              ${
                user.isFriend
                  ? `<button class="small-action" disabled>已是好友</button>`
                  : user.requestPending
                    ? `<button class="small-action" disabled>已申请</button>`
                    : `<button class="small-action primary" data-add-user="${user.id}">添加</button>`
              }
            </div>
          </article>`
        )
        .join("")
    : `<div class="request-card">没有匹配用户</div>`;
}

async function createGroupPanel() {
  els.detailsPane.classList.add("open");
  els.detailsContent.innerHTML = `
    <div class="panel-form">
      <input id="groupNameInput" placeholder="群聊名称" />
      <div class="chip-list">
        ${state.contacts
          .map(
            (contact) => `
            <label class="chip">
              <input type="checkbox" value="${contact.id}" />
              ${escapeHtml(contact.displayName)}
            </label>`
          )
          .join("")}
      </div>
      <button class="small-action primary" id="createGroupSubmit">创建</button>
    </div>`;
}

async function createGroup() {
  const name = document.querySelector("#groupNameInput").value.trim();
  const memberIds = [...document.querySelectorAll(".chip input:checked")].map((input) => input.value);
  try {
    await api("/api/groups", {
      method: "POST",
      body: JSON.stringify({ name, memberIds }),
    });
    await refreshBootstrap();
    toast("群聊已创建");
  } catch (error) {
    toast(error.message);
  }
}

function bindEvents() {
  els.showLogin.addEventListener("click", () => setAuthMode("login"));
  els.showRegister.addEventListener("click", () => setAuthMode("register"));
  els.loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await login(els.loginAccount.value, els.loginPassword.value);
    } catch (error) {
      els.authMessage.textContent = error.message;
    }
  });
  els.registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await register();
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
    if (item) {
      await selectConversation(item.dataset.type, item.dataset.id);
      return;
    }
    const accept = event.target.closest("[data-accept]");
    const reject = event.target.closest("[data-reject]");
    if (accept || reject) {
      const requestId = (accept || reject).dataset.accept || (accept || reject).dataset.reject;
      const action = accept ? "accept" : "reject";
      await api("/api/friends/respond", {
        method: "POST",
        body: JSON.stringify({ requestId, action }),
      });
      await refreshBootstrap();
      return;
    }
    if (event.target.closest("#openSearchBtn")) {
      els.detailsPane.classList.add("open");
      renderSearchPanel();
      return;
    }
    if (event.target.closest("#openProfileBtn")) {
      els.detailsPane.classList.add("open");
      renderProfilePanel();
    }
  });

  els.searchInput.addEventListener("input", renderList);
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
    reader.onload = () => sendMessage("image", reader.result);
    reader.readAsDataURL(file);
    els.imageInput.value = "";
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

  els.detailsBtn.addEventListener("click", () => {
    els.detailsPane.classList.toggle("open");
    renderDetails();
  });
  els.closeDetailsBtn.addEventListener("click", () => els.detailsPane.classList.remove("open"));
  els.newGroupBtn.addEventListener("click", createGroupPanel);
  els.detailsContent.addEventListener("click", async (event) => {
    if (event.target.closest("#userSearchBtn")) {
      await searchUsers();
      return;
    }
    const addButton = event.target.closest("[data-add-user]");
    if (addButton) {
      await api("/api/friends/request", {
        method: "POST",
        body: JSON.stringify({ toId: addButton.dataset.addUser }),
      });
      await searchUsers();
      toast("好友申请已发送");
      return;
    }
    if (event.target.closest("#createGroupSubmit")) {
      await createGroup();
      return;
    }
    const color = event.target.closest(".color-swatches button");
    if (color) {
      document.querySelectorAll(".color-swatches button").forEach((button) => button.classList.remove("selected"));
      color.classList.add("selected");
    }
  });
  els.detailsContent.addEventListener("submit", async (event) => {
    if (event.target.closest("#profileForm")) await saveProfile(event);
  });

  els.logoutBtn.addEventListener("click", async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch {
      // Local logout is enough for the demo if the server is already disconnected.
    }
    localStorage.removeItem("flowlink_token");
    location.reload();
  });
  els.mobileBackBtn.addEventListener("click", () => els.workspaceView.classList.remove("chat-open"));
}

bindEvents();

if (state.token) {
  enterWorkspace().catch(() => {
    localStorage.removeItem("flowlink_token");
    state.token = "";
    els.authView.classList.remove("hidden");
  });
}
