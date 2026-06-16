import { resolveUrl } from "../api/http";

export function displayName(item) {
  return item?.groupNickname || item?.displayName || item?.name || item?.username || "未命名";
}

export function accountName(item) {
  return item?.username ? `@${item.username}` : "";
}

export function avatarText(item) {
  return displayName(item).slice(0, 1).toUpperCase();
}

export function avatarStyle(item) {
  const value = item?.avatarUrl || "";
  return value.startsWith("linear-gradient") ? { background: value } : {};
}

export function avatarImage(item) {
  const value = item?.avatarUrl || "";
  return value && !value.startsWith("linear-gradient") ? resolveUrl(value) : "";
}

export function entityTitle(item) {
  return displayName(item);
}

export function entitySubtitle(item) {
  if (item?.isAiAssistant) return "AI 助手 · 可帮助整理答辩、功能和开发问题";
  if (item?.groupNickname && item?.displayName) return `${item.displayName} · ${accountName(item)}`;
  return item?.notice || item?.statusMessage || item?.role || item?.username || "FlowLink";
}

export function roleLabel(role) {
  if (Number(role) === 2) return "群主";
  if (Number(role) === 1) return "管理员";
  return "成员";
}

export function previewText(item) {
  const message = item?.lastMessage;
  if (!message) return entitySubtitle(item);
  if (message.messageType === 2 || message.messageType === "image") return "[图片]";
  if (message.messageType === 3 || message.messageType === "file") return "[文件]";
  if (message.messageType === 4 || message.messageType === "voice") return "[语音]";
  return message.content || entitySubtitle(item);
}

export function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

export function formatFileSize(bytes) {
  const size = Number(bytes || 0);
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  if (size >= 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${size || 0} B`;
}

export function conversationTime(item) {
  return formatTime(item?.lastMessage?.sendTime || item?.lastMessage?.createdAt);
}

export function mediaUrl(value) {
  return resolveUrl(value || "");
}
