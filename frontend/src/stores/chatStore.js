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
    pending: new Map(),
    toastText: ""
  }),
  getters: {
    conversations(state) {
      return [...state.groups, ...state.contacts];
    },
    currentEntity(state) {
      if (!state.selected) return null;
      return state.selected.type === "group"
        ? state.groups.find((item) => String(item.id) === String(state.selected.id))
        : state.contacts.find((item) => String(item.id) === String(state.selected.id));
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
    },
    setTab(tab) {
      this.activeTab = tab;
      if (tab !== "chats") this.selected = null;
    },
    connectRealtime() {
      if (!this.token) return;
      if (this.ws) this.ws.close();
      const wsBase = `ws://${location.hostname}:8090/ws?token=${encodeURIComponent(this.token)}`;
      this.ws = new WebSocket(wsBase);
      this.ws.onmessage = (event) => this.handleRealtime(JSON.parse(event.data));
      this.ws.onclose = () => window.setTimeout(() => this.connectRealtime(), 1400);
    },
    handleRealtime(packet) {
      if (packet.action === "new_message") {
        const message = packet.payload.message;
        if (String(message.groupId || message.receiverId) === String(this.selected?.id)) this.messages.push(message);
      }
      if (packet.action === "message_failed") this.toast(packet.payload.message || "消息发送失败");
    },
    async sendMessage(content, messageType = 1, fileRecordId = null) {
      if (!this.selected || !content.trim()) return;
      const payload = {
        conversationType: this.selected.type,
        targetId: this.selected.id,
        content,
        messageType,
        ...(fileRecordId ? { fileRecordId } : {}),
        clientId: `web_${Date.now()}`
      };
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ action: "send_message", payload }));
        this.messages.push({ ...payload, senderId: this.me.id, sendTime: new Date().toISOString() });
      } else {
        const message = await request("/api/messages/send", { method: "POST", body: JSON.stringify(payload) });
        this.messages.push(message);
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
      await this.sendMessage(meta.url, messageType, meta.fileRecordId);
    },
    async saveProfile(form) {
      this.me = await request("/api/me", { method: "PATCH", body: JSON.stringify(form) });
      await this.bootstrap();
      this.toast("资料已保存");
    }
  }
});
