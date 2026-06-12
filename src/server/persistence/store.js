import fs from "node:fs";
import { config } from "../config.js";
import { demoUsers, seedDb } from "../domain/seed.js";
import { avatar, hashPassword, privateConversationId, splitPrivateConversationId } from "../shared/utils.js";

const legacyIds = Object.fromEntries([
  [`u_${"wang"}${"hui"}`, "u_linche"],
  [`u_${"gui"}${"ming"}${"yang"}`, "u_shenyan"],
  [`u_${"xu"}${"qian"}${"tao"}`, "u_xuzhihang"],
  [`u_${"jiang"}${"xu"}${"dong"}`, "u_zhouyu"],
  [`u_${"wang"}${"zhen"}${"yue"}`, "u_yelan"],
  [`u_${"gong"}${"xing"}${"wang"}`, "u_songyao"],
]);

const demoAliases = Object.fromEntries(demoUsers.map((user) => [user.id, user]));

const demoGroupDefaults = {
  g_a2607: {
    name: "A2607 FlowLink 项目组",
    notice: "今日重点：完善资料页、群聊管理、文件消息和禁言能力。",
    description: "课程设计项目组，集中讨论 FlowLink 的需求、架构、联调和验收。",
  },
  g_frontend: {
    name: "前端体验联调",
    notice: "重点检查消息气泡、未读、重连、输入反馈和文件卡片。",
    description: "前端 UI、WebSocket 客户端和交互体验联调小组。",
  },
};

function isBrokenText(value) {
  return typeof value === "string" && /锟|�|鏋|璐|閫|浣|缇|娑|鐢|鍓|鍚|瀹|鏁|\?{2,}/.test(value);
}

function migrateId(value) {
  return legacyIds[value] || value;
}

function migrateList(values = []) {
  return values.map((value) => migrateId(value)).filter(Boolean);
}

function normalizeDemoUser(user) {
  const userId = migrateId(user.id);
  const alias = demoAliases[userId];
  if (!alias) return { ...user, id: userId };
  return {
    ...user,
    id: userId,
    username: alias.username,
    email: alias.email,
    displayName: alias.displayName,
    role: alias.role,
    department: alias.department,
    phone: user.phone || alias.phone,
    location: alias.location,
    statusMessage: alias.statusMessage,
    bio: alias.bio,
    avatar: avatar(alias.displayName, user.avatar?.background || alias.color),
    password: hashPassword("flowlink123", alias.salt),
  };
}

function normalizeDb(source) {
  return {
    users: (source.users || []).map(normalizeDemoUser),
    sessions: Object.fromEntries(
      Object.entries(source.sessions || {}).map(([token, session]) => [
        token,
        { ...session, userId: migrateId(session.userId) },
      ])
    ),
    friendships: (source.friendships || []).map((item) => ({ ...item, users: migrateList(item.users) })),
    friendRequests: (source.friendRequests || []).map((item) => ({
      ...item,
      fromId: migrateId(item.fromId),
      toId: migrateId(item.toId),
      message: isBrokenText(item.message) ? "数据库结构已经准备好，拉我进前端联调。" : item.message,
    })),
    groups: (source.groups || []).map((group) => {
      const defaults = demoGroupDefaults[group.id] || {};
      const ownerId = migrateId(group.ownerId);
      return {
        ...group,
        name: isBrokenText(group.name) ? defaults.name || group.name : group.name,
        notice: isBrokenText(group.notice) ? defaults.notice || group.notice : group.notice,
        description: isBrokenText(group.description) ? defaults.description || "" : group.description || group.notice || "",
        ownerId,
        memberIds: migrateList(group.memberIds),
        admins: [
          ...new Set([
            ...migrateList(group.admins || [ownerId].filter(Boolean)),
            ...(group.id === "g_a2607" ? ["u_linche"] : []),
          ]),
        ],
        muted: Boolean(group.muted),
        muteAll: Boolean(group.muteAll),
        mutedMembers: migrateList(group.mutedMembers || []),
      };
    }),
    messages: (source.messages || []).map((message) => ({
      ...message,
      senderId: migrateId(message.senderId),
      targetId: migrateId(message.targetId),
      deliveredTo: migrateList(message.deliveredTo),
      readBy: migrateList(message.readBy),
      messageType: message.messageType || "text",
      fileName: message.fileName || null,
      fileSize: Number(message.fileSize || 0),
      fileType: message.fileType || null,
      conversationId:
        message.conversationType === "private"
          ? privateConversationId(...splitPrivateConversationId(message.conversationId).map(migrateId))
          : message.conversationId,
    })),
    fileRecords: (source.fileRecords || []).map((item) => ({
      ...item,
      uploaderId: migrateId(item.uploaderId),
      messageId: item.messageId || null,
    })),
    notifications: (source.notifications || []).map((item) => ({ ...item, receiverId: migrateId(item.receiverId) })),
    adminLogs: source.adminLogs || [],
  };
}

function writeDb(db) {
  fs.writeFileSync(config.dbFile, JSON.stringify(db, null, 2), "utf8");
}

function loadDb() {
  fs.mkdirSync(config.dataDir, { recursive: true });
  if (!fs.existsSync(config.dbFile)) {
    const seeded = seedDb();
    writeDb(seeded);
    return seeded;
  }
  try {
    const normalized = normalizeDb(JSON.parse(fs.readFileSync(config.dbFile, "utf8")));
    writeDb(normalized);
    return normalized;
  } catch {
    fs.renameSync(config.dbFile, `${config.dbFile}.${Date.now()}.bak`);
    const seeded = seedDb();
    writeDb(seeded);
    return seeded;
  }
}

const db = loadDb();

export const store = {
  db,
  save() {
    writeDb(db);
  },
};
