import { defineStore } from "pinia";
import { markRaw } from "vue";
import { getRealtimeBase, request } from "../api/http";

export const useChatStore = defineStore("chat", {
  state: () => ({
    token: localStorage.getItem("flowlink_token") || "",
    lastSelected: JSON.parse(localStorage.getItem("flowlink_selected") || "null"),
    me: null,
    contacts: [],
    groups: [],
    requests: [],
    notifications: [],
    pinnedConversations: JSON.parse(localStorage.getItem("flowlink_pinned") || "[]"),
    hiddenConversations: JSON.parse(localStorage.getItem("flowlink_hidden") || "[]"),
    theme: localStorage.getItem("flowlink_theme") || "wechat",
    activeTab: "chats",
    selected: null,
    messages: [],
    ws: null,
    reconnectTimer: null,
    heartbeatTimer: null,
    bootstrapTimer: null,
    backendStatus: "unknown",
    connectionStatus: "offline",
    pending: new Map(),
    call: {
      visible: false,
      status: "idle",
      callId: "",
      peerId: null,
      peerName: "",
      incoming: false,
      mediaType: "video",
      localStream: null,
      remoteStream: null,
      pc: null,
      muted: false,
      cameraOff: false,
      errorText: "",
      iceQueue: []
    },
    toastText: ""
  }),
  getters: {
    conversations(state) {
      const hidden = new Set(state.hiddenConversations);
      const pinned = new Set(state.pinnedConversations);
      return [...state.groups, ...state.contacts]
      .filter((item) => !hidden.has(`${item.conversationType || (item.ownerId ? "group" : "private")}:${item.id}`))
      .sort((a, b) => {
        const aKey = `${a.conversationType || (a.ownerId ? "group" : "private")}:${a.id}`;
        const bKey = `${b.conversationType || (b.ownerId ? "group" : "private")}:${b.id}`;
        const pinnedDiff = Number(pinned.has(bKey)) - Number(pinned.has(aKey));
        if (pinnedDiff) return pinnedDiff;
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
    notificationUnread(state) {
      return state.notifications.filter((item) => !item.read).length;
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
    async register(form) {
      const data = await request("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(form)
      });
      this.token = data.token;
      localStorage.setItem("flowlink_token", data.token);
      await this.bootstrap();
      this.connectRealtime();
      this.toast("注册成功，欢迎加入 FlowLink");
    },
    async logout() {
      try {
        await request("/api/auth/logout", { method: "POST" });
      } catch {
        // 本地退出优先，服务端失败不阻断用户离开。
      }
      window.clearTimeout(this.reconnectTimer);
      window.clearInterval(this.heartbeatTimer);
      if (this.ws) {
        this.ws.onclose = null;
        this.ws.close();
      }
      localStorage.removeItem("flowlink_token");
      localStorage.removeItem("flowlink_selected");
      this.token = "";
      this.lastSelected = null;
      this.me = null;
      this.contacts = [];
      this.groups = [];
      this.requests = [];
      this.notifications = [];
      this.selected = null;
      this.messages = [];
      this.backendStatus = "unknown";
      this.connectionStatus = "offline";
    },
    async bootstrap() {
      const data = await request("/api/bootstrap");
      this.backendStatus = "online";
      this.me = data.user;
      this.contacts = data.contacts || [];
      this.groups = data.groups || [];
      this.requests = data.requests || [];
      this.notifications = data.notifications || [];
      if (this.activeTab === "chats" && !this.selected && this.lastSelected) {
        const exists = this.lastSelected.type === "group"
          ? this.groups.some((item) => String(item.id) === String(this.lastSelected.id))
          : this.contacts.some((item) => String(item.id) === String(this.lastSelected.id));
        if (exists) await this.selectConversation(this.lastSelected.type, this.lastSelected.id);
      }
    },
    nameOf(userId) {
      if (String(userId) === String(this.me?.id)) return this.me?.displayName || this.me?.username || "我";
      const contact = this.contacts.find((item) => String(item.id) === String(userId));
      if (contact) return contact.displayName || contact.username || "联系人";
      for (const group of this.groups) {
        const member = group.members?.find((item) => String(item.id) === String(userId));
        if (member) return member.groupNickname || member.displayName || member.username || "成员";
      }
      return `用户 ${userId}`;
    },
    async searchUsers(keyword) {
      if (!keyword.trim()) return [];
      return request(`/api/users?q=${encodeURIComponent(keyword.trim())}`);
    },
    async requestFriend(toId, message = "你好，希望添加你为好友") {
      try {
        await request("/api/friends/request", {
          method: "POST",
          body: JSON.stringify({ toId, message })
        });
        await this.bootstrap();
        this.toast("好友申请已发送");
      } catch (error) {
        this.toast(error.message || "好友申请发送失败");
      }
    },
    async respondFriendRequest(requestId, action) {
      try {
        await request("/api/friends/respond", {
          method: "POST",
          body: JSON.stringify({ requestId, action })
        });
        await this.bootstrap();
        this.toast(action === "accept" ? "已通过好友申请" : "已拒绝好友申请");
      } catch (error) {
        this.toast(error.message || "操作失败");
      }
    },
    async createGroup(form) {
      const group = await request("/api/groups", {
        method: "POST",
        body: JSON.stringify(form)
      });
      await this.bootstrap();
      await this.selectConversation("group", group.id);
      this.toast("群聊已创建");
    },
    async refreshNotifications() {
      this.notifications = await request("/api/notifications");
    },
    async deleteNotification(notificationId) {
      await request(`/api/notifications/${notificationId}`, { method: "DELETE" });
      this.notifications = this.notifications.filter((item) => String(item.id) !== String(notificationId));
      this.toast("通知已删除");
    },
    async deleteAllNotifications() {
      await request("/api/notifications", { method: "DELETE" });
      this.notifications = [];
      this.toast("通知已全部删除");
    },
    async markNotificationsRead() {
      await request("/api/notifications/read-all", { method: "PATCH" });
      this.notifications = this.notifications.map((item) => ({ ...item, read: true }));
      this.toast("通知已全部标记为已读");
    },
    async updateGroup(groupId, form) {
      await request(`/api/groups/${groupId}`, {
        method: "PATCH",
        body: JSON.stringify(form)
      });
      await this.bootstrap();
      this.toast("群聊资料已更新");
    },
    async updateMyGroupNickname(groupId, nickname) {
      await request(`/api/groups/${groupId}/my-nickname`, {
        method: "PATCH",
        body: JSON.stringify({ nickname })
      });
      await this.bootstrap();
      this.toast("群昵称已保存");
    },
    async inviteGroupMembers(groupId, memberIds) {
      if (!memberIds.length) return;
      await request(`/api/groups/${groupId}/members`, {
        method: "POST",
        body: JSON.stringify({ memberIds })
      });
      await this.bootstrap();
      this.toast("成员已邀请");
    },
    async removeGroupMember(groupId, memberId) {
      await request(`/api/groups/${groupId}/members/${memberId}`, { method: "DELETE" });
      await this.bootstrap();
      this.toast("成员已移除");
    },
    async setGroupAdmin(groupId, memberId, admin) {
      await request(`/api/groups/${groupId}/admins`, {
        method: "POST",
        body: JSON.stringify({ memberId, admin })
      });
      await this.bootstrap();
      this.toast(admin ? "已设为管理员" : "已取消管理员");
    },
    async setGroupMute(groupId, memberId, muted) {
      await request(`/api/groups/${groupId}/mutes`, {
        method: "POST",
        body: JSON.stringify({ memberId, muted })
      });
      await this.bootstrap();
      this.toast(muted ? "成员已禁言" : "成员已解除禁言");
    },
    async transferGroupOwner(groupId, memberId) {
      await request(`/api/groups/${groupId}/owner`, {
        method: "POST",
        body: JSON.stringify({ memberId })
      });
      await this.bootstrap();
      this.toast("群主已转让");
    },
    async leaveGroup(groupId) {
      await request(`/api/groups/${groupId}/leave`, { method: "POST" });
      await this.bootstrap();
      this.selected = null;
      this.messages = [];
      this.toast("已退出群聊");
    },
    async dissolveGroup(groupId) {
      await request(`/api/groups/${groupId}`, { method: "DELETE" });
      await this.bootstrap();
      this.selected = null;
      this.messages = [];
      this.toast("群聊已解散");
    },
    async deleteFriend(friendId) {
      await request(`/api/friends/${friendId}`, { method: "DELETE" });
      await this.bootstrap();
      this.selected = null;
      this.messages = [];
      this.toast("好友已删除");
    },
    async blockFriend(friendId) {
      await request(`/api/friends/${friendId}/block`, { method: "POST" });
      await this.bootstrap();
      this.selected = null;
      this.messages = [];
      this.toast("已拉黑该用户");
    },
    async restoreSession() {
      if (!this.token) return;
      this.backendStatus = "checking";
      this.connectionStatus = "offline";
      window.clearTimeout(this.bootstrapTimer);
      try {
        await this.bootstrap();
        this.connectRealtime();
      } catch (error) {
        if (!error.isNetwork) {
          localStorage.removeItem("flowlink_token");
          localStorage.removeItem("flowlink_selected");
          this.token = "";
          this.lastSelected = null;
          this.me = null;
          this.backendStatus = "online";
          this.connectionStatus = "offline";
          this.toast(error.message === "请先登录" ? "登录已失效，请重新登录" : error.message);
          return;
        }
        this.backendStatus = "offline";
        this.connectionStatus = "offline";
        this.toast("后端启动中，正在重试连接");
        this.bootstrapTimer = window.setTimeout(() => this.restoreSession(), 1800);
      }
    },
    async selectConversation(type, id) {
      this.activeTab = "chats";
      const key = `${type}:${id}`;
      if (this.hiddenConversations.includes(key)) {
        this.hiddenConversations = this.hiddenConversations.filter((item) => item !== key);
        localStorage.setItem("flowlink_hidden", JSON.stringify(this.hiddenConversations));
      }
      this.selected = { type, id, conversationId: id };
      this.lastSelected = this.selected;
      localStorage.setItem("flowlink_selected", JSON.stringify(this.selected));
      this.messages = await request(`/api/messages/history?type=${encodeURIComponent(type)}&targetId=${encodeURIComponent(id)}`);
      this.clearConversationUnread(type, id);
    },
    closeConversation() {
      this.selected = null;
      this.messages = [];
      localStorage.removeItem("flowlink_selected");
    },
    async loadEarlierMessages() {
      if (!this.selected || !this.messages.length) return 0;
      const firstId = this.messages.find((item) => item.id)?.id;
      if (!firstId) return 0;
      const earlier = await request(`/api/messages/history?type=${encodeURIComponent(this.selected.type)}&targetId=${encodeURIComponent(this.selected.id)}&beforeId=${encodeURIComponent(firstId)}&limit=50`);
      const existing = new Set(this.messages.map((item) => String(item.id || item.clientId)));
      const fresh = earlier.filter((item) => !existing.has(String(item.id || item.clientId)));
      this.messages = [...fresh, ...this.messages];
      return fresh.length;
    },
    async setTab(tab) {
      this.activeTab = tab;
      if (tab !== "chats") this.selected = null;
      if (tab === "notifications") await this.refreshNotifications();
    },
    togglePinnedConversation(type, id) {
      const key = `${type}:${id}`;
      this.pinnedConversations = this.pinnedConversations.includes(key)
        ? this.pinnedConversations.filter((item) => item !== key)
        : [key, ...this.pinnedConversations];
      localStorage.setItem("flowlink_pinned", JSON.stringify(this.pinnedConversations));
    },
    hideConversation(type, id) {
      const key = `${type}:${id}`;
      if (!this.hiddenConversations.includes(key)) {
        this.hiddenConversations = [key, ...this.hiddenConversations];
        localStorage.setItem("flowlink_hidden", JSON.stringify(this.hiddenConversations));
      }
      if (this.selected?.type === type && String(this.selected?.id) === String(id)) {
        this.selected = null;
        this.messages = [];
        localStorage.removeItem("flowlink_selected");
      }
    },
    connectRealtime() {
      if (!this.token) return;
      const previous = this.ws;
      if (previous) {
        previous.onclose = null;
        previous.close();
      }
      window.clearTimeout(this.reconnectTimer);
      window.clearInterval(this.heartbeatTimer);
      window.clearTimeout(this.bootstrapTimer);
      this.connectionStatus = "connecting";
      const wsBase = `${getRealtimeBase()}/ws?token=${encodeURIComponent(this.token)}`;
      this.ws = new WebSocket(wsBase);
      const openTimer = window.setTimeout(() => {
        if (this.ws?.readyState !== WebSocket.OPEN) {
          this.connectionStatus = "error";
          try { this.ws?.close(); } catch {}
        }
      }, 3500);
      this.ws.onopen = () => {
        window.clearTimeout(openTimer);
        this.connectionStatus = "online";
        this.heartbeatTimer = window.setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ action: "heartbeat", payload: {} }));
          }
        }, 25000);
      };
      this.ws.onmessage = (event) => this.handleRealtime(JSON.parse(event.data));
      this.ws.onerror = () => {
        window.clearTimeout(openTimer);
        this.connectionStatus = "error";
      };
      this.ws.onclose = () => {
        window.clearTimeout(openTimer);
        window.clearInterval(this.heartbeatTimer);
        if (!this.token) {
          this.connectionStatus = "offline";
          return;
        }
        if (this.connectionStatus === "error") {
          this.toast("实时连接异常，消息仍会保存，可稍后自动重连");
          this.reconnectTimer = window.setTimeout(() => this.connectRealtime(), 4000);
          return;
        }
        this.connectionStatus = "reconnecting";
        this.reconnectTimer = window.setTimeout(() => this.connectRealtime(), 1800);
      };
    },
    handleRealtime(packet) {
      if (packet.action === "heartbeat_ack") {
        this.connectionStatus = "online";
        return;
      }
      if (String(packet.action || "").startsWith("call_")) {
        this.handleCallSignal(packet.action, packet.payload || {});
        return;
      }
      if (packet.action === "group_member_updated") {
        this.applyGroupMemberUpdate(packet.payload || {});
        return;
      }
      if (packet.action === "new_message") {
        const message = packet.payload.message;
        const type = message.conversationType === 2 || message.conversationType === "group" ? "group" : "private";
        const id = this.conversationIdForMessage(message);
        if (String(id) === String(this.selected?.id) && type === this.selected?.type) {
          this.upsertMessage(message);
        } else {
          this.increaseConversationUnread(type, id);
        }
        this.updateConversationPreview(type, id, message);
      }
      if (packet.action === "message_recalled") {
        this.applyRecall(packet.payload.messageId);
        const type = packet.payload.conversationType === 2 || packet.payload.conversationType === "group" ? "group" : "private";
        const id = type === "group"
          ? packet.payload.groupId
          : String(packet.payload.senderId) === String(this.me?.id)
            ? packet.payload.receiverId
            : packet.payload.senderId;
        this.updateConversationPreview(type, id, {
          id: packet.payload.messageId,
          content: "消息已撤回",
          messageType: 5,
          recalled: true,
          sendTime: new Date().toISOString()
        });
      }
      if (packet.action === "message_deleted") this.removeMessage(packet.payload.messageId);
      if (packet.action === "message_ack") this.connectionStatus = "online";
      if (packet.action === "message_failed") this.toast(packet.payload.message || "消息发送失败");
      if (packet.action === "friend_request_received") {
        const req = packet.payload.request;
        if (req) {
          const existing = this.requests.find((item) => Number(item.id) === Number(req.id));
          if (!existing) {
            this.requests = [req, ...this.requests];
            this.toast(`收到来自 ${req.senderName || "用户"} 的好友申请`);
          }
        }
      }
    },
    async recallMessage(messageId) {
      if (!messageId) return;
      try {
        const message = await request(`/api/messages/${messageId}/recall`, { method: "POST" });
        this.applyRecall(message.id || messageId);
        this.updateConversationPreview(this.selected.type, this.selected.id, {
          ...message,
          content: "消息已撤回",
          recalled: true
        });
        this.toast("消息已撤回");
      } catch (error) {
        this.toast(error.message || "撤回失败");
      }
    },
    async deleteMessage(messageId) {
      if (!messageId) return;
      try {
        await request(`/api/messages/${messageId}`, { method: "DELETE" });
        this.removeMessage(messageId);
        this.toast("消息已删除");
      } catch (error) {
        this.toast(error.message || "删除失败");
      }
    },
    applyRecall(messageId) {
      const message = this.messages.find((item) => String(item.id) === String(messageId));
      if (!message) return;
      message.recalled = true;
      message.content = "消息已撤回";
      message.messageType = 5;
      message.fileName = "";
      message.fileSize = 0;
      message.fileType = "";
      message.fileUrl = "";
    },
    removeMessage(messageId) {
      this.messages = this.messages.filter((item) => String(item.id) !== String(messageId));
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
      let message;
      try {
        message = await request("/api/messages/send", { method: "POST", body: JSON.stringify(payload) });
      } catch (error) {
        this.toast(error.message || "消息发送失败");
        return;
      }
      this.upsertMessage(message);
      this.updateConversationPreview(this.selected.type, this.selected.id, message);
    },
    async sendText(content) {
      await this.sendMessage(content, 1);
    },
    async sendReply(content, replyTo) {
      const prefix = replyTo ? `回复 ${this.nameOf(replyTo.senderId)}：${replyTo.content || "[消息]"}\n` : "";
      await this.sendMessage(`${prefix}${content}`, 1);
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
    async uploadAndSendVoice(file, duration = 0) {
      const form = new FormData();
      form.append("file", file);
      const meta = await request("/api/files/upload", { method: "POST", body: form });
      await this.sendMessage(meta.url, 4, meta.fileRecordId, {
        fileName: meta.fileName,
        fileSize: meta.fileSize,
        fileType: meta.fileType,
        voiceDuration: duration
      });
    },
    async uploadAvatar(file) {
      const form = new FormData();
      form.append("file", file);
      const meta = await request("/api/files/upload", { method: "POST", body: form });
      return meta.url;
    },
    async saveProfile(form) {
      this.me = await request("/api/me", { method: "PATCH", body: JSON.stringify(form) });
      this.activeTab = "settings";
      this.selected = null;
      await this.bootstrap();
      this.activeTab = "settings";
      this.selected = null;
      this.toast("资料已保存");
    },
    setTheme(theme) {
      this.theme = theme;
      localStorage.setItem("flowlink_theme", theme);
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
    },
    upsertMessage(message) {
      const index = this.messages.findIndex((item) => {
        if (message.id && item.id) return String(item.id) === String(message.id);
        if (message.clientId && item.clientId) return String(item.clientId) === String(message.clientId);
        return false;
      });
      if (index >= 0) {
        this.messages[index] = { ...this.messages[index], ...message };
        return;
      }
      this.messages.push(message);
    },
    conversationIdForMessage(message) {
      const type = message.conversationType === 2 || message.conversationType === "group" ? "group" : "private";
      if (type === "group") return message.groupId;
      return String(message.senderId) === String(this.me?.id) ? message.receiverId : message.senderId;
    },
    applyGroupMemberUpdate(payload) {
      const groupId = payload.groupId;
      const userId = payload.userId;
      const nickname = payload.groupNickname || "";
      const group = this.groups.find((item) => String(item.id) === String(groupId));
      const member = group?.members?.find((item) => String(item.id) === String(userId));
      if (member) member.groupNickname = nickname;
      if (String(userId) === String(this.me?.id) && this.selected?.type === "group" && String(this.selected.id) === String(groupId)) {
        this.toast(nickname ? "群昵称已同步" : "群昵称已清空");
      }
    },
    sendRealtime(action, payload = {}) {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        this.toast("实时连接未建立，暂时不能发起视频通话");
        return false;
      }
      this.ws.send(JSON.stringify({ action, payload }));
      return true;
    },
    callPeerName(userId) {
      return this.nameOf(userId);
    },
    async startVideoCall(targetId) {
      if (!targetId) return;
      if (this.selected?.type === "group") {
        this.toast("当前版本先支持一对一局域网视频通话");
        return;
      }
      if (this.call.visible && this.call.status !== "idle") {
        this.toast("已有通话正在进行");
        return;
      }
      const callId = `call_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      this.call = {
        ...this.call,
        visible: true,
        status: "calling",
        callId,
        peerId: targetId,
        peerName: this.callPeerName(targetId),
        incoming: false,
        mediaType: "video",
        remoteStream: null,
        muted: false,
        cameraOff: false,
        errorText: "",
        iceQueue: []
      };
      try {
        await this.startLocalMedia();
      } catch (error) {
        this.endCall(false);
        this.toast(error.message || "无法打开摄像头或麦克风");
        return;
      }
      this.sendRealtime("call_invite", { targetId, callId, mediaType: "video" });
    },
    async acceptCall() {
      if (!this.call.incoming || !this.call.peerId) return;
      this.call.status = "connecting";
      this.call.errorText = "";
      try {
        await this.startLocalMedia();
        this.sendRealtime("call_accept", {
          targetId: this.call.peerId,
          callId: this.call.callId,
          mediaType: this.call.mediaType
        });
      } catch (error) {
        this.sendRealtime("call_reject", {
          targetId: this.call.peerId,
          callId: this.call.callId,
          reason: "media_denied"
        });
        this.endCall(false);
        this.toast(error.message || "无法打开摄像头或麦克风");
      }
    },
    rejectCall() {
      if (this.call.peerId && this.call.callId) {
        this.sendRealtime("call_reject", { targetId: this.call.peerId, callId: this.call.callId });
      }
      this.endCall(false);
    },
    hangupCall() {
      if (this.call.peerId && this.call.callId) {
        this.sendRealtime("call_hangup", { targetId: this.call.peerId, callId: this.call.callId });
      }
      this.endCall(false);
    },
    async startLocalMedia() {
      if (this.call.localStream) return this.call.localStream;
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("当前设备不支持摄像头/麦克风调用");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      this.call.localStream = markRaw(stream);
      return stream;
    },
    async ensurePeerConnection() {
      if (this.call.pc) return this.call.pc;
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
      });
      pc.onicecandidate = (event) => {
        if (event.candidate && this.call.peerId) {
          this.sendRealtime("call_ice", {
            targetId: this.call.peerId,
            callId: this.call.callId,
            candidate: event.candidate.toJSON()
          });
        }
      };
      pc.ontrack = (event) => {
        const [stream] = event.streams;
        if (stream) this.call.remoteStream = markRaw(stream);
      };
      pc.onconnectionstatechange = () => {
        if (["connected", "completed"].includes(pc.connectionState)) this.call.status = "active";
        if (["failed", "disconnected"].includes(pc.connectionState)) this.call.errorText = "视频连接不稳定，请确认双方在同一局域网";
        if (pc.connectionState === "closed") this.endCall(false);
      };
      const stream = await this.startLocalMedia();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      this.call.pc = markRaw(pc);
      await this.flushIceQueue();
      return pc;
    },
    async createAndSendOffer() {
      const pc = await this.ensurePeerConnection();
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.call.status = "connecting";
      this.sendRealtime("call_offer", {
        targetId: this.call.peerId,
        callId: this.call.callId,
        sdp: pc.localDescription
      });
    },
    async answerOffer(sdp) {
      const pc = await this.ensurePeerConnection();
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      await this.flushIceQueue();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.call.status = "connecting";
      this.sendRealtime("call_answer", {
        targetId: this.call.peerId,
        callId: this.call.callId,
        sdp: pc.localDescription
      });
    },
    async applyAnswer(sdp) {
      const pc = await this.ensurePeerConnection();
      if (pc.signalingState !== "stable") {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        await this.flushIceQueue();
      }
    },
    async addRemoteIce(candidate) {
      if (!candidate) return;
      if (!this.call.pc || !this.call.pc.remoteDescription) {
        this.call.iceQueue.push(candidate);
        return;
      }
      await this.call.pc.addIceCandidate(new RTCIceCandidate(candidate));
    },
    async flushIceQueue() {
      if (!this.call.pc || !this.call.pc.remoteDescription || !this.call.iceQueue.length) return;
      const queue = [...this.call.iceQueue];
      this.call.iceQueue = [];
      for (const candidate of queue) {
        await this.call.pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    },
    async handleCallSignal(action, payload) {
      try {
        if (action === "call_unavailable" || action === "call_error") {
          this.toast(payload.message || "视频通话暂不可用");
          this.endCall(false);
          return;
        }
        if (action === "call_ringing") {
          this.call.status = "ringing";
          return;
        }
        if (action === "call_invite") {
          if (this.call.visible && this.call.status !== "idle") {
            this.sendRealtime("call_reject", {
              targetId: payload.fromUserId,
              callId: payload.callId,
              reason: "busy"
            });
            return;
          }
          this.call = {
            ...this.call,
            visible: true,
            status: "incoming",
            callId: payload.callId,
            peerId: payload.fromUserId,
            peerName: this.callPeerName(payload.fromUserId),
            incoming: true,
            mediaType: payload.mediaType || "video",
            localStream: null,
            remoteStream: null,
            pc: null,
            muted: false,
            cameraOff: false,
            errorText: "",
            iceQueue: []
          };
          return;
        }
        if (payload.callId && this.call.callId && payload.callId !== this.call.callId) return;
        if (action === "call_accept") {
          this.call.status = "connecting";
          await this.createAndSendOffer();
          return;
        }
        if (action === "call_reject") {
          this.toast("对方已拒绝视频通话");
          this.endCall(false);
          return;
        }
        if (action === "call_cancel" || action === "call_hangup") {
          this.toast("视频通话已结束");
          this.endCall(false);
          return;
        }
        if (action === "call_offer") {
          this.call.status = "connecting";
          await this.answerOffer(payload.sdp);
          return;
        }
        if (action === "call_answer") {
          await this.applyAnswer(payload.sdp);
          return;
        }
        if (action === "call_ice") {
          await this.addRemoteIce(payload.candidate);
        }
      } catch (error) {
        this.call.errorText = error.message || "视频通话连接失败";
        this.toast(this.call.errorText);
      }
    },
    toggleCallMic() {
      const stream = this.call.localStream;
      if (!stream) return;
      this.call.muted = !this.call.muted;
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !this.call.muted;
      });
    },
    toggleCallCamera() {
      const stream = this.call.localStream;
      if (!stream) return;
      this.call.cameraOff = !this.call.cameraOff;
      stream.getVideoTracks().forEach((track) => {
        track.enabled = !this.call.cameraOff;
      });
    },
    endCall(notifyPeer = false) {
      if (notifyPeer && this.call.peerId && this.call.callId) {
        this.sendRealtime("call_hangup", { targetId: this.call.peerId, callId: this.call.callId });
      }
      try { this.call.pc?.close(); } catch {}
      this.call.localStream?.getTracks?.().forEach((track) => track.stop());
      this.call.remoteStream?.getTracks?.().forEach((track) => track.stop());
      this.call = {
        visible: false,
        status: "idle",
        callId: "",
        peerId: null,
        peerName: "",
        incoming: false,
        mediaType: "video",
        localStream: null,
        remoteStream: null,
        pc: null,
        muted: false,
        cameraOff: false,
        errorText: "",
        iceQueue: []
      };
    }
  }
});
