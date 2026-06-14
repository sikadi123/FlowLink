import { defineStore } from "pinia";
import { request } from "../api/http";

export const useChatStore = defineStore("chat", {
  state: () => ({
    token: localStorage.getItem("flowlink_token") || "",
    me: null,
    contacts: [],
    groups: [],
    requests: [],
    notifications: [],
    activeTab: "chats",
    selected: null,
    messages: [],
    ws: null,
    connectionStatus: "offline",
    pending: new Map(),
    toastText: ""
  }),
  getters: {
    conversations(state) {
      return [...state.groups, ...state.contacts].sort((a, b) => {
        const unreadDiff = Number(b.unread || 0) - Number(a.unread || 0);
        if (unreadDiff) return unreadDiff;
        return new Date(b.lastMessage?.sendTime || b.lastMessage?.createdAt || 0) - new Date(a.lastMessage?.sendTime || a.lastMessage?.createdAt || 0);
      });
    },
    currentEntity(state) {
      if (!state.selected) return null;
      return state.selected.type === "group"
        ? state.groups.find((item) => String(item.id) === String(state.selected.id))
        : state.contacts.find((item) => String(item.id) === String(state.selected.id));
    },
    totalUnread(state) {
      return [...state.groups, ...state.contacts].reduce((sum, item) => sum + Number(item.unread || 0), 0);
    },
    surfaceMode(state) {
      return state.activeTab !== "chats" || !state.selected;
    }
  },
  actions: {
    toast(message) {
      this.toastText = message;
      window.clearTimeout(this._toastTimer);
      this._toastTimer = window.setTimeout(() => (this.toastText = ""), 2200);
    },
    async login(account, password) {
      const data = await request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ account, password })
      });
      this.token = data.token;
      localStorage.setItem("flowlink_token", data.token);
      await this.bootstrap();
      this.connectRealtime();
    },
    async logout() {
      try {
        await request("/api/auth/logout", { method: "POST" });
      } catch {
        // 本地退出优先，服务端失败不阻断用户离开。
      }
      if (this.ws) this.ws.close();
      localStorage.removeItem("flowlink_token");
      this.token = "";
      this.me = null;
      this.contacts = [];
      this.groups = [];
      this.requests = [];
      this.notifications = [];
      this.selected = null;
      this.messages = [];
      this.connectionStatus = "offline";
    },
    async bootstrap() {
      const data = await request("/api/bootstrap");
      this.me = data.user;
      this.contacts = data.contacts || [];
      this.groups = data.groups || [];
      this.requests = data.requests || [];
      this.notifications = data.notifications || [];
    },
    async selectConversation(type, id) {
      this.activeTab = "chats";
      this.selected = { type, id, conversationId: id };
      this.messages = await request(`/api/messages/history?type=${encodeURIComponent(type)}&targetId=${encodeURIComponent(id)}`);
      this.clearConversationUnread(type, id);
    },
    setTab(tab) {
      this.activeTab = tab;
      if (tab !== "chats") this.selected = null;
    },
    connectRealtime() {
      if (!this.token) return;
      if (this.ws) this.ws.close();
      this.connectionStatus = "connecting";
      const wsBase = `ws://${location.hostname}:8090/ws?token=${encodeURIComponent(this.token)}`;
      this.ws = new WebSocket(wsBase);
      this.ws.onopen = () => (this.connectionStatus = "online");
      this.ws.onmessage = (event) => this.handleRealtime(JSON.parse(event.data));
      this.ws.onerror = () => (this.connectionStatus = "error");
      this.ws.onclose = () => {
        this.connectionStatus = "reconnecting";
        window.setTimeout(() => this.connectRealtime(), 1400);
      };
    },
    handleRealtime(packet) {
      if (packet.action === "new_message") {
        const message = packet.payload.message;
        const type = message.conversationType === 2 || message.conversationType === "group" ? "group" : "private";
        const id = type === "group" ? message.groupId : message.senderId;
        if (String(id) === String(this.selected?.id) && type === this.selected?.type) {
          this.messages.push(message);
        } else {
          this.increaseConversationUnread(type, id);
        }
        this.updateConversationPreview(type, id, message);
      }
      if (packet.action === "message_failed") this.toast(packet.payload.message || "消息发送失败");
    },
    async sendMessage(content, messageType = 1, fileRecordId = null, metadata = {}) {
      if (!this.selected || !content.trim()) return;
      const payload = {
        conversationType: this.selected.type,
        targetId: this.selected.id,
        content,
        messageType,
        ...(fileRecordId ? { fileRecordId } : {}),
        ...metadata,
        clientId: `web_${Date.now()}`
      };
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ action: "send_message", payload }));
        this.messages.push({ ...payload, senderId: this.me.id, sendTime: new Date().toISOString() });
        this.updateConversationPreview(this.selected.type, this.selected.id, payload);
      } else {
        const message = await request("/api/messages/send", { method: "POST", body: JSON.stringify(payload) });
        this.messages.push(message);
        this.updateConversationPreview(this.selected.type, this.selected.id, message);
      }
    },
    async sendText(content) {
      await this.sendMessage(content, 1);
    },
    async uploadAndSend(file) {
      const form = new FormData();
      form.append("file", file);
      const meta = await request("/api/files/upload", { method: "POST", body: form });
      const messageType = file.type?.startsWith("image/") ? 2 : 3;
      await this.sendMessage(meta.url, messageType, meta.fileRecordId, {
        fileName: meta.fileName,
        fileSize: meta.fileSize,
        fileType: meta.fileType
      });
    },
    async saveProfile(form) {
      this.me = await request("/api/me", { method: "PATCH", body: JSON.stringify(form) });
      await this.bootstrap();
      this.toast("资料已保存");
    },
    clearConversationUnread(type, id) {
      const collection = type === "group" ? this.groups : this.contacts;
      const item = collection.find((entry) => String(entry.id) === String(id));
      if (item) item.unread = 0;
    },
    increaseConversationUnread(type, id) {
      const collection = type === "group" ? this.groups : this.contacts;
      const item = collection.find((entry) => String(entry.id) === String(id));
      if (item) item.unread = Number(item.unread || 0) + 1;
    },
    updateConversationPreview(type, id, message) {
      const collection = type === "group" ? this.groups : this.contacts;
      const item = collection.find((entry) => String(entry.id) === String(id));
      if (item) item.lastMessage = message;
    }
  }
});
