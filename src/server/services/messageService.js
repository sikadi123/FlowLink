import { config } from "../config.js";
import { store } from "../persistence/store.js";
import { ApiError, id, nowIso, privateConversationId, splitPrivateConversationId } from "../shared/utils.js";
import { canManageGroup, groupService } from "./groupService.js";
import { areFriends } from "./socialService.js";
import { publicUser } from "./userService.js";

export function assertConversationAccess(userId, type, targetId) {
  if (type === "private") {
    const target = store.db.users.find((user) => user.id === targetId);
    if (!target || !areFriends(userId, targetId)) throw new ApiError(403, "只能向好友发送私聊消息");
    return;
  }
  if (type === "group") {
    const group = groupService.getGroup(targetId);
    if (!group || !group.memberIds.includes(userId)) throw new ApiError(403, "你不在该群聊中");
    return;
  }
  throw new ApiError(400, "未知会话类型");
}

function assertCanSpeak(userId, type, targetId) {
  if (type !== "group") return;
  const group = groupService.getGroup(targetId);
  if (!group) throw new ApiError(404, "群聊不存在");
  if ((group.mutedMembers || []).includes(userId)) throw new ApiError(403, "你已被管理员禁言");
  if (canManageGroup(group, userId)) return;
  if (group.muteAll) throw new ApiError(403, "当前群聊已开启全员禁言");
}

export function getConversationRecipients(senderId, type, conversationIdOrTargetId) {
  if (type === "private") {
    if (conversationIdOrTargetId.startsWith("p:")) return splitPrivateConversationId(conversationIdOrTargetId);
    return [senderId, conversationIdOrTargetId];
  }
  return groupService.getGroup(conversationIdOrTargetId)?.memberIds || [senderId];
}

function sanitizeMessage(message, hub) {
  return {
    ...message,
    sender: publicUser(store.db.users.find((user) => user.id === message.senderId), hub),
  };
}

export const messageService = {
  conversationId(type, targetId, currentUserId) {
    return type === "private" ? privateConversationId(currentUserId, targetId) : targetId;
  },

  list(type, targetId, currentUser, hub) {
    assertConversationAccess(currentUser.id, type, targetId);
    const conversationId = this.conversationId(type, targetId, currentUser.id);
    const messages = store.db.messages
      .filter((message) => message.conversationType === type && message.conversationId === conversationId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    for (const message of messages) {
      if (!message.readBy) message.readBy = [];
      if (!message.readBy.includes(currentUser.id)) message.readBy.push(currentUser.id);
    }
    store.save();
    return messages.map((message) => sanitizeMessage(message, hub));
  },

  create(senderId, payload, hub) {
    const conversationType = String(payload.conversationType || "private");
    const targetId = String(payload.targetId || "");
    assertConversationAccess(senderId, conversationType, targetId);
    assertCanSpeak(senderId, conversationType, targetId);
    const conversationId = this.conversationId(conversationType, targetId, senderId);
    const content = String(payload.content || "").trim();
    const messageType = ["image", "file"].includes(payload.messageType) ? payload.messageType : "text";
    if (!content) throw new ApiError(400, "消息内容不能为空");
    if (messageType === "text" && content.length > 2000) throw new ApiError(400, "文本消息不能超过 2000 字");
    if (messageType === "file" && Number(payload.fileSize || 0) > 2 * 1024 * 1024) throw new ApiError(400, "演示版文件不能超过 2MB");
    const recipients = getConversationRecipients(senderId, conversationType, conversationId);
    const onlineRecipients = recipients.filter((recipientId) => recipientId !== senderId && hub.isOnline(recipientId));
    const message = {
      id: id("m"),
      conversationType,
      conversationId,
      targetId,
      senderId,
      content,
      messageType,
      fileName: payload.fileName || null,
      fileSize: Number(payload.fileSize || 0),
      fileType: payload.fileType || null,
      status: "sent",
      deliveredTo: onlineRecipients,
      readBy: [senderId],
      createdAt: nowIso(),
    };
    store.db.messages.push(message);
    if (messageType === "image" || messageType === "file") {
      store.db.fileRecords.push({
        id: id("file"),
        uploaderId: senderId,
        messageId: message.id,
        fileName: payload.fileName || `${messageType}-${message.id}`,
        storagePath: `demo://message/${message.id}`,
        fileSize: Number(payload.fileSize || Buffer.byteLength(content)),
        fileType: payload.fileType || content.match(/^data:([^;]+);/)?.[1] || (messageType === "image" ? "image/*" : "application/octet-stream"),
        uploadTime: nowIso(),
      });
    }
    store.save();
    const safeMessage = sanitizeMessage(message, hub);
    hub.notifyUsers(recipients, "new_message", { message: safeMessage, clientId: payload.clientId || null });
    return safeMessage;
  },

  recall(currentUser, messageId, hub) {
    const message = store.db.messages.find((item) => item.id === messageId);
    if (!message || message.senderId !== currentUser.id) throw new ApiError(404, "消息不存在");
    if (Date.now() - new Date(message.createdAt).getTime() > config.recallWindowMs) {
      throw new ApiError(403, "只能撤回 2 分钟内的消息");
    }
    message.status = "recalled";
    message.recalledAt = nowIso();
    store.save();
    const recipients = getConversationRecipients(currentUser.id, message.conversationType, message.conversationId);
    hub.notifyUsers(recipients, "message_recalled", { messageId: message.id, conversationId: message.conversationId });
    return message;
  },

  markRead(currentUser, type, targetId, hub) {
    const messages = this.list(type, targetId, currentUser, hub);
    const conversationId = this.conversationId(type, targetId, currentUser.id);
    const recipients = getConversationRecipients(currentUser.id, type, conversationId);
    hub.notifyUsers(recipients, "read_receipt", { readerId: currentUser.id, conversationType: type, conversationId });
    return messages;
  },

  lastMessage(type, targetId, currentUserId) {
    const conversationId = this.conversationId(type, targetId, currentUserId);
    return store.db.messages
      .filter((message) => message.conversationType === type && message.conversationId === conversationId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .at(-1) || null;
  },

  unread(type, targetId, currentUserId) {
    const conversationId = this.conversationId(type, targetId, currentUserId);
    return store.db.messages.filter((message) => {
      if (message.conversationType !== type || message.conversationId !== conversationId) return false;
      if (message.senderId === currentUserId || message.status === "recalled") return false;
      return !message.readBy?.includes(currentUserId);
    }).length;
  },
};
