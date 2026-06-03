import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "flowlink-demo.json");
const PUBLIC_DIR = path.join(__dirname, "public");
const WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
const MESSAGE_RECALL_WINDOW_MS = 2 * 60 * 1000;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function nowIso() {
  return new Date().toISOString();
}

function id(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

function avatar(displayName, background = "#07c160") {
  return {
    text: [...displayName][0] || "F",
    background,
  };
}

function hashPassword(password, salt = crypto.randomBytes(12).toString("hex")) {
  const hash = crypto
    .createHash("sha256")
    .update(`${salt}:${password}`)
    .digest("hex");
  return { salt, hash };
}

function verifyPassword(password, saved) {
  if (!saved?.salt || !saved?.hash) return false;
  return hashPassword(password, saved.salt).hash === saved.hash;
}

function seedDb() {
  const demoPassword = "flowlink123";
  const users = [
    {
      id: "u_wanghui",
      username: "wanghui",
      email: "wanghui@flowlink.local",
      displayName: "王辉",
      role: "前端开发",
      bio: "负责微信风格 UI 和交互体验。",
      avatar: avatar("王辉", "#07c160"),
      password: hashPassword(demoPassword, "flowlink-wanghui"),
      status: "offline",
      createdAt: nowIso(),
    },
    {
      id: "u_guimingyang",
      username: "guimingyang",
      email: "guimingyang@flowlink.local",
      displayName: "桂明洋",
      role: "通讯架构师",
      bio: "关注 Netty 长连接、ACK 与消息路由。",
      avatar: avatar("桂明洋", "#2f80ed"),
      password: hashPassword(demoPassword, "flowlink-guimingyang"),
      status: "offline",
      createdAt: nowIso(),
    },
    {
      id: "u_xuqiantao",
      username: "xuqiantao",
      email: "xuqiantao@flowlink.local",
      displayName: "徐乾涛",
      role: "WebSocket 客户端",
      bio: "负责实时状态管理和消息幂等。",
      avatar: avatar("徐乾涛", "#7c3aed"),
      password: hashPassword(demoPassword, "flowlink-xuqiantao"),
      status: "offline",
      createdAt: nowIso(),
    },
    {
      id: "u_jiangxudong",
      username: "jiangxudong",
      email: "jiangxudong@flowlink.local",
      displayName: "姜旭东",
      role: "安全与缓存",
      bio: "负责 JWT、Redis 网关和敏感词策略。",
      avatar: avatar("姜旭东", "#f97316"),
      password: hashPassword(demoPassword, "flowlink-jiangxudong"),
      status: "offline",
      createdAt: nowIso(),
    },
    {
      id: "u_wangzhenyue",
      username: "wangzhenyue",
      email: "wangzhenyue@flowlink.local",
      displayName: "王振越",
      role: "数据负责人",
      bio: "负责 MySQL、MinIO 和数据映射。",
      avatar: avatar("王振越", "#0f766e"),
      password: hashPassword(demoPassword, "flowlink-wangzhenyue"),
      status: "offline",
      createdAt: nowIso(),
    },
    {
      id: "u_gongxingwang",
      username: "gongxingwang",
      email: "gongxingwang@flowlink.local",
      displayName: "龚兴旺",
      role: "后端编码",
      bio: "负责用户、好友和群组业务闭环。",
      avatar: avatar("龚兴旺", "#e11d48"),
      password: hashPassword(demoPassword, "flowlink-gongxingwang"),
      status: "offline",
      createdAt: nowIso(),
    },
  ];

  const createdAt = nowIso();
  return {
    users,
    sessions: {},
    friendships: [
      { id: "fr_1", users: ["u_wanghui", "u_guimingyang"], createdAt },
      { id: "fr_2", users: ["u_wanghui", "u_xuqiantao"], createdAt },
      { id: "fr_3", users: ["u_wanghui", "u_jiangxudong"], createdAt },
      { id: "fr_4", users: ["u_guimingyang", "u_xuqiantao"], createdAt },
      { id: "fr_5", users: ["u_guimingyang", "u_wangzhenyue"], createdAt },
      { id: "fr_6", users: ["u_jiangxudong", "u_gongxingwang"], createdAt },
    ],
    friendRequests: [
      {
        id: "req_1",
        fromId: "u_wangzhenyue",
        toId: "u_wanghui",
        status: "pending",
        message: "数据库这边我已经准备好表结构了，拉我进前端联调。",
        createdAt,
      },
    ],
    groups: [
      {
        id: "g_a2607",
        name: "A2607 FlowLink 项目组",
        avatar: avatar("流", "#07c160"),
        ownerId: "u_guimingyang",
        memberIds: users.map((user) => user.id),
        notice: "目标：先跑通聊天闭环，再补齐可靠性与工程化。",
        createdAt,
      },
      {
        id: "g_frontend",
        name: "前端体验联调",
        avatar: avatar("前", "#2563eb"),
        ownerId: "u_wanghui",
        memberIds: ["u_wanghui", "u_xuqiantao", "u_guimingyang"],
        notice: "重点检查消息气泡、未读、重连和输入反馈。",
        createdAt,
      },
    ],
    messages: [
      messageSeed("m_1", "group", "g_a2607", "u_guimingyang", "今天先按文档拆 MVP：账号、好友、私聊、群聊和 ACK。", -55),
      messageSeed("m_2", "group", "g_a2607", "u_wanghui", "UI 我会参考微信的三栏结构，聊天体验先做顺滑。", -48),
      messageSeed("m_3", "group", "g_a2607", "u_xuqiantao", "WebSocket 客户端会加重连和输入中状态。", -42),
      messageSeed("m_4", "private", privateConversationId("u_wanghui", "u_guimingyang"), "u_guimingyang", "王辉，先把 demo 做到能演示实时聊天就很够用了。", -35),
      messageSeed("m_5", "private", privateConversationId("u_wanghui", "u_guimingyang"), "u_wanghui", "收到，我会把未读、历史、图片消息也一起带上。", -31),
      messageSeed("m_6", "private", privateConversationId("u_wanghui", "u_xuqiantao"), "u_xuqiantao", "状态机这块我建议按 conversationId 做统一索引。", -24),
      messageSeed("m_7", "group", "g_frontend", "u_wanghui", "这个页面先不要做成营销页，打开就是聊天工作台。", -18),
    ],
    fileRecords: [],
    notifications: [],
    adminLogs: [],
  };
}

function messageSeed(idValue, conversationType, conversationId, senderId, content, minutesAgo) {
  const createdAt = new Date(Date.now() + minutesAgo * 60 * 1000).toISOString();
  return {
    id: idValue,
    conversationType,
    conversationId,
    senderId,
    content,
    messageType: "text",
    status: "sent",
    deliveredTo: [],
    readBy: [senderId],
    createdAt,
  };
}

function loadDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    const seeded = seedDb();
    fs.writeFileSync(DB_FILE, JSON.stringify(seeded, null, 2), "utf8");
    return seeded;
  }
  try {
    return normalizeDb(JSON.parse(fs.readFileSync(DB_FILE, "utf8")));
  } catch {
    const backup = `${DB_FILE}.${Date.now()}.bak`;
    fs.renameSync(DB_FILE, backup);
    const seeded = seedDb();
    fs.writeFileSync(DB_FILE, JSON.stringify(seeded, null, 2), "utf8");
    return seeded;
  }
}

function normalizeDb(source) {
  return {
    ...source,
    fileRecords: source.fileRecords || [],
    notifications: source.notifications || [],
    adminLogs: source.adminLogs || [],
    messages: (source.messages || []).map((message) => ({
      ...message,
      conversationId:
        message.conversationType === "private" && message.conversationId?.startsWith("p_")
          ? privateConversationId(...splitPrivateConversationId(message.conversationId))
          : message.conversationId,
    })),
  };
}

let db = loadDb();
const clients = new Map();

function saveDb() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    bio: user.bio,
    avatar: user.avatar,
    status: isOnline(user.id) ? "online" : "offline",
    createdAt: user.createdAt,
  };
}

function privateConversationId(a, b) {
  return `p:${[a, b].sort().join(":")}`;
}

function splitPrivateConversationId(convId) {
  if (convId.startsWith("p:")) return convId.slice(2).split(":");
  if (convId.startsWith("p_")) {
    const matched = db?.users?.filter((user) => convId.includes(user.id)).map((user) => user.id) || [];
    if (matched.length === 2) return matched.sort();
  }
  return [];
}

function conversationId(type, targetId, currentUserId) {
  return type === "private" ? privateConversationId(currentUserId, targetId) : targetId;
}

function getSessionUser(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const session = db.sessions[token];
  if (!session) return null;
  const user = db.users.find((item) => item.id === session.userId);
  return user ? { token, user } : null;
}

function isOnline(userId) {
  return clients.has(userId) && clients.get(userId).size > 0;
}

function getFriends(userId) {
  const friendIds = db.friendships
    .filter((item) => item.users.includes(userId))
    .map((item) => item.users.find((idValue) => idValue !== userId));
  return db.users.filter((user) => friendIds.includes(user.id));
}

function areFriends(a, b) {
  return db.friendships.some((item) => item.users.includes(a) && item.users.includes(b));
}

function getConversationMessages(type, targetId, currentUserId) {
  const convId = conversationId(type, targetId, currentUserId);
  return db.messages
    .filter((message) => message.conversationType === type && message.conversationId === convId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

function getLastMessage(type, targetId, currentUserId) {
  const messages = getConversationMessages(type, targetId, currentUserId);
  return messages.at(-1) || null;
}

function getUnread(type, targetId, currentUserId) {
  return getConversationMessages(type, targetId, currentUserId).filter((message) => {
    if (message.senderId === currentUserId || message.status === "recalled") return false;
    return !message.readBy?.includes(currentUserId);
  }).length;
}

function buildBootstrap(currentUser) {
  const contacts = getFriends(currentUser.id).map((friend) => ({
    ...publicUser(friend),
    conversationType: "private",
    conversationId: privateConversationId(currentUser.id, friend.id),
    lastMessage: getLastMessage("private", friend.id, currentUser.id),
    unread: getUnread("private", friend.id, currentUser.id),
  }));

  const groups = db.groups
    .filter((group) => group.memberIds.includes(currentUser.id))
    .map((group) => ({
      ...group,
      members: group.memberIds.map((memberId) => publicUser(db.users.find((user) => user.id === memberId))),
      conversationType: "group",
      conversationId: group.id,
      lastMessage: getLastMessage("group", group.id, currentUser.id),
      unread: getUnread("group", group.id, currentUser.id),
    }));

  const requests = db.friendRequests
    .filter((request) => request.toId === currentUser.id || request.fromId === currentUser.id)
    .map((request) => ({
      ...request,
      from: publicUser(db.users.find((user) => user.id === request.fromId)),
      to: publicUser(db.users.find((user) => user.id === request.toId)),
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return {
    user: publicUser(currentUser),
    contacts,
    groups,
    requests,
    notifications: db.notifications
      .filter((item) => item.receiverId === currentUser.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 20),
    stats: {
      users: db.users.length,
      friendships: db.friendships.length,
      groups: db.groups.length,
      messages: db.messages.length,
      files: db.fileRecords.length,
      online: [...clients.keys()].length,
    },
  };
}

function sanitizeMessage(message) {
  return {
    ...message,
    sender: publicUser(db.users.find((user) => user.id === message.senderId)),
  };
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ApiError(400, "请求体不是有效 JSON");
  }
}

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function requireAuth(req) {
  const session = getSessionUser(req);
  if (!session) throw new ApiError(401, "请先登录");
  return session;
}

async function handleApi(req, res, pathname, searchParams) {
  try {
    if (req.method === "POST" && pathname === "/api/auth/login") {
      const body = await readJson(req);
      const account = String(body.account || "").trim().toLowerCase();
      const password = String(body.password || "");
      const user = db.users.find((item) => {
        return (
          item.username.toLowerCase() === account ||
          item.email.toLowerCase() === account ||
          item.displayName.toLowerCase() === account
        );
      });
      if (!user || !verifyPassword(password, user.password)) {
        throw new ApiError(401, "账号或密码错误");
      }
      const token = id("tok");
      db.sessions[token] = { userId: user.id, createdAt: nowIso() };
      saveDb();
      return sendJson(res, 200, { success: true, data: { token, user: publicUser(user) } });
    }

    if (req.method === "POST" && pathname === "/api/auth/register") {
      const body = await readJson(req);
      const username = String(body.username || "").trim();
      const email = String(body.email || "").trim().toLowerCase();
      const displayName = String(body.displayName || username).trim();
      const password = String(body.password || "");
      if (!/^[a-zA-Z0-9_]{4,20}$/.test(username)) {
        throw new ApiError(400, "用户名需为 4-20 位字母、数字或下划线");
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new ApiError(400, "邮箱格式不正确");
      }
      if (password.length < 8) {
        throw new ApiError(400, "密码至少 8 位");
      }
      if (db.users.some((user) => user.username.toLowerCase() === username.toLowerCase())) {
        throw new ApiError(409, "用户名已存在");
      }
      if (db.users.some((user) => user.email.toLowerCase() === email)) {
        throw new ApiError(409, "邮箱已存在");
      }
      const color = ["#07c160", "#2f80ed", "#7c3aed", "#f97316", "#0f766e", "#e11d48"][
        db.users.length % 6
      ];
      const user = {
        id: id("u"),
        username,
        email,
        displayName,
        role: "FlowLink 用户",
        bio: "新的连接正在建立。",
        avatar: avatar(displayName, color),
        password: hashPassword(password),
        status: "offline",
        createdAt: nowIso(),
      };
      db.users.push(user);
      saveDb();
      return sendJson(res, 201, { success: true, data: { user: publicUser(user) } });
    }

    const { token, user } = requireAuth(req);

    if (req.method === "POST" && pathname === "/api/auth/logout") {
      delete db.sessions[token];
      saveDb();
      return sendJson(res, 200, { success: true });
    }

    if (req.method === "GET" && pathname === "/api/bootstrap") {
      return sendJson(res, 200, { success: true, data: buildBootstrap(user) });
    }

    if (req.method === "PATCH" && pathname === "/api/me") {
      const body = await readJson(req);
      const displayName = String(body.displayName || user.displayName).trim().slice(0, 20);
      const bio = String(body.bio || "").trim().slice(0, 120);
      const role = String(body.role || user.role || "").trim().slice(0, 30);
      const avatarColor = String(body.avatarColor || user.avatar?.background || "#07c160");
      if (displayName.length < 1) throw new ApiError(400, "昵称不能为空");
      user.displayName = displayName;
      user.bio = bio;
      user.role = role;
      user.avatar = avatar(displayName, /^#[0-9a-fA-F]{6}$/.test(avatarColor) ? avatarColor : "#07c160");
      user.updatedAt = nowIso();
      db.adminLogs.push({
        id: id("log"),
        adminId: user.id,
        operationType: "UPDATE_PROFILE",
        targetUserId: user.id,
        operationDetail: "用户更新个人资料",
        operationTime: nowIso(),
      });
      saveDb();
      broadcastPresence(user.id);
      return sendJson(res, 200, { success: true, data: publicUser(user) });
    }

    if (req.method === "GET" && pathname === "/api/users") {
      const q = String(searchParams.get("q") || "").trim().toLowerCase();
      const friendIds = new Set(getFriends(user.id).map((friend) => friend.id));
      const list = db.users
        .filter((item) => item.id !== user.id)
        .filter((item) => {
          if (!q) return true;
          return (
            item.username.toLowerCase().includes(q) ||
            item.email.toLowerCase().includes(q) ||
            item.displayName.toLowerCase().includes(q)
          );
        })
        .slice(0, 20)
        .map((item) => ({
          ...publicUser(item),
          isFriend: friendIds.has(item.id),
          requestPending: db.friendRequests.some(
            (request) =>
              request.status === "pending" &&
              ((request.fromId === user.id && request.toId === item.id) ||
                (request.fromId === item.id && request.toId === user.id))
          ),
        }));
      return sendJson(res, 200, { success: true, data: list });
    }

    if (req.method === "POST" && pathname === "/api/friends/request") {
      const body = await readJson(req);
      const toId = String(body.toId || "");
      const target = db.users.find((item) => item.id === toId);
      if (!target || target.id === user.id) throw new ApiError(404, "用户不存在");
      if (areFriends(user.id, toId)) throw new ApiError(409, "你们已经是好友");
      const existing = db.friendRequests.find(
        (request) =>
          request.status === "pending" &&
          ((request.fromId === user.id && request.toId === toId) ||
            (request.fromId === toId && request.toId === user.id))
      );
      if (existing) throw new ApiError(409, "已有待处理的好友申请");
      const request = {
        id: id("req"),
        fromId: user.id,
        toId,
        status: "pending",
        message: String(body.message || "希望添加你为好友").slice(0, 120),
        createdAt: nowIso(),
      };
      db.friendRequests.push(request);
      createNotification(toId, "friend_request", `${user.displayName} 请求添加你为好友`);
      saveDb();
      notifyUsers([toId], "friend_request", {
        request: {
          ...request,
          from: publicUser(user),
          to: publicUser(target),
        },
      });
      return sendJson(res, 201, { success: true, data: request });
    }

    if (req.method === "POST" && pathname === "/api/friends/respond") {
      const body = await readJson(req);
      const request = db.friendRequests.find((item) => item.id === body.requestId);
      if (!request || request.toId !== user.id || request.status !== "pending") {
        throw new ApiError(404, "好友申请不存在");
      }
      request.status = body.action === "accept" ? "accepted" : "rejected";
      request.updatedAt = nowIso();
      if (request.status === "accepted" && !areFriends(request.fromId, request.toId)) {
        db.friendships.push({ id: id("fr"), users: [request.fromId, request.toId], createdAt: nowIso() });
        createNotification(request.fromId, "friend_accepted", `${user.displayName} 已通过你的好友申请`);
      }
      saveDb();
      notifyUsers([request.fromId, request.toId], "friend_request_updated", { request });
      return sendJson(res, 200, { success: true, data: request });
    }

    if (req.method === "POST" && pathname === "/api/groups") {
      const body = await readJson(req);
      const name = String(body.name || "").trim();
      const memberIds = Array.isArray(body.memberIds) ? body.memberIds : [];
      if (name.length < 2) throw new ApiError(400, "群名称至少 2 个字符");
      const allowed = new Set([user.id, ...getFriends(user.id).map((friend) => friend.id)]);
      const uniqueMembers = [...new Set([user.id, ...memberIds])].filter((memberId) => allowed.has(memberId));
      if (uniqueMembers.length < 2) throw new ApiError(400, "至少选择 1 位好友");
      const group = {
        id: id("g"),
        name,
        avatar: avatar(name, "#07c160"),
        ownerId: user.id,
        memberIds: uniqueMembers,
        notice: "新的群聊已创建。",
        createdAt: nowIso(),
      };
      db.groups.push(group);
      for (const memberId of uniqueMembers) {
        if (memberId !== user.id) createNotification(memberId, "group_invite", `${user.displayName} 邀请你加入 ${name}`);
      }
      const systemMessage = {
        id: id("m"),
        conversationType: "group",
        conversationId: group.id,
        senderId: user.id,
        content: `${user.displayName} 创建了群聊「${name}」`,
        messageType: "system",
        status: "sent",
        deliveredTo: [],
        readBy: [user.id],
        createdAt: nowIso(),
      };
      db.messages.push(systemMessage);
      saveDb();
      notifyUsers(uniqueMembers, "group_created", { group });
      return sendJson(res, 201, { success: true, data: group });
    }

    if (req.method === "GET" && pathname === "/api/messages/history") {
      const type = String(searchParams.get("type") || "private");
      const targetId = String(searchParams.get("targetId") || "");
      assertConversationAccess(user.id, type, targetId);
      const messages = getConversationMessages(type, targetId, user.id);
      for (const message of messages) {
        if (!message.readBy) message.readBy = [];
        if (!message.readBy.includes(user.id)) message.readBy.push(user.id);
      }
      saveDb();
      broadcastReadReceipt(user.id, type, targetId);
      return sendJson(res, 200, { success: true, data: messages.map(sanitizeMessage) });
    }

    if (req.method === "POST" && pathname === "/api/messages/send") {
      const body = await readJson(req);
      const sent = createAndSendMessage(user.id, body);
      return sendJson(res, 201, { success: true, data: sent });
    }

    const recallMatch = pathname.match(/^\/api\/messages\/([^/]+)\/recall$/);
    if (req.method === "POST" && recallMatch) {
      const message = db.messages.find((item) => item.id === recallMatch[1]);
      if (!message || message.senderId !== user.id) throw new ApiError(404, "消息不存在");
      if (Date.now() - new Date(message.createdAt).getTime() > MESSAGE_RECALL_WINDOW_MS) {
        throw new ApiError(403, "只能撤回 2 分钟内的消息");
      }
      message.status = "recalled";
      message.recalledAt = nowIso();
      saveDb();
      const recipients = getConversationRecipients(user.id, message.conversationType, message.conversationId);
      notifyUsers(recipients, "message_recalled", { messageId: message.id, conversationId: message.conversationId });
      return sendJson(res, 200, { success: true, data: message });
    }

    throw new ApiError(404, "接口不存在");
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    sendJson(res, status, { success: false, message: error.message || "服务器错误" });
  }
}

function assertConversationAccess(userId, type, targetId) {
  if (type === "private") {
    const target = db.users.find((item) => item.id === targetId);
    if (!target || !areFriends(userId, targetId)) throw new ApiError(403, "只能向好友发送私聊消息");
    return;
  }
  if (type === "group") {
    const group = db.groups.find((item) => item.id === targetId);
    if (!group || !group.memberIds.includes(userId)) throw new ApiError(403, "你不在该群聊中");
    return;
  }
  throw new ApiError(400, "未知会话类型");
}

function createAndSendMessage(senderId, payload) {
  const conversationType = String(payload.conversationType || "private");
  const targetId = String(payload.targetId || "");
  assertConversationAccess(senderId, conversationType, targetId);
  const convId = conversationId(conversationType, targetId, senderId);
  const content = String(payload.content || "").trim();
  const messageType = payload.messageType === "image" ? "image" : "text";
  if (!content) throw new ApiError(400, "消息内容不能为空");
  if (messageType === "text" && content.length > 2000) throw new ApiError(400, "文本消息不能超过 2000 字");
  const recipients = getConversationRecipients(senderId, conversationType, convId);
  const onlineRecipients = recipients.filter((recipientId) => recipientId !== senderId && isOnline(recipientId));
  const message = {
    id: id("m"),
    conversationType,
    conversationId: convId,
    targetId,
    senderId,
    content,
    messageType,
    status: "sent",
    deliveredTo: onlineRecipients,
    readBy: [senderId],
    createdAt: nowIso(),
  };
  db.messages.push(message);
  if (messageType === "image") {
    db.fileRecords.push({
      id: id("file"),
      uploaderId: senderId,
      messageId: message.id,
      fileName: payload.fileName || `image-${message.id}.png`,
      storagePath: `demo://message/${message.id}`,
      fileSize: Buffer.byteLength(content),
      fileType: content.match(/^data:([^;]+);/)?.[1] || "image/*",
      uploadTime: nowIso(),
    });
  }
  saveDb();
  notifyUsers(recipients, "new_message", {
    message: sanitizeMessage(message),
    clientId: payload.clientId || null,
  });
  return sanitizeMessage(message);
}

function getConversationRecipients(senderId, type, convIdOrTargetId) {
  if (type === "private") {
    if (convIdOrTargetId.startsWith("p:") || convIdOrTargetId.startsWith("p_")) {
      return splitPrivateConversationId(convIdOrTargetId);
    }
    return [senderId, convIdOrTargetId];
  }
  const group = db.groups.find((item) => item.id === convIdOrTargetId);
  return group ? group.memberIds : [senderId];
}

function createNotification(receiverId, type, content) {
  db.notifications.push({
    id: id("ntf"),
    receiverId,
    type,
    content,
    isRead: false,
    createdAt: nowIso(),
  });
}

function broadcastReadReceipt(readerId, type, targetId) {
  const convId = conversationId(type, targetId, readerId);
  const recipients = getConversationRecipients(readerId, type, convId);
  notifyUsers(recipients, "read_receipt", { readerId, conversationType: type, conversationId: convId });
}

function notifyUsers(userIds, action, payload) {
  for (const userId of new Set(userIds)) {
    const sockets = clients.get(userId);
    if (!sockets) continue;
    for (const client of sockets) {
      client.send({ action, payload });
    }
  }
}

function broadcastPresence(userId) {
  const user = db.users.find((item) => item.id === userId);
  if (!user) return;
  const contactIds = new Set(getFriends(userId).map((friend) => friend.id));
  db.groups
    .filter((group) => group.memberIds.includes(userId))
    .forEach((group) => group.memberIds.forEach((memberId) => contactIds.add(memberId)));
  notifyUsers([...contactIds], "presence", { user: publicUser(user) });
}

function serveStatic(req, res, pathname) {
  const requested = pathname === "/" ? "/index.html" : decodeURIComponent(pathname);
  const filePath = path.normalize(path.join(PUBLIC_DIR, requested));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const currentUrl = new URL(req.url, `http://${req.headers.host}`);
  if (currentUrl.pathname.startsWith("/api/")) {
    handleApi(req, res, currentUrl.pathname, currentUrl.searchParams);
    return;
  }
  serveStatic(req, res, currentUrl.pathname);
});

server.on("upgrade", (req, socket) => {
  const currentUrl = new URL(req.url, `http://${req.headers.host}`);
  if (currentUrl.pathname !== "/ws") {
    socket.destroy();
    return;
  }
  const token = currentUrl.searchParams.get("token") || "";
  const session = db.sessions[token];
  const user = session ? db.users.find((item) => item.id === session.userId) : null;
  if (!user) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }

  const acceptKey = crypto.createHash("sha1").update(`${req.headers["sec-websocket-key"]}${WS_GUID}`).digest("base64");
  socket.write(
    "HTTP/1.1 101 Switching Protocols\r\n" +
      "Upgrade: websocket\r\n" +
      "Connection: Upgrade\r\n" +
      `Sec-WebSocket-Accept: ${acceptKey}\r\n\r\n`
  );

  const client = createWsClient(socket, user);
  if (!clients.has(user.id)) clients.set(user.id, new Set());
  clients.get(user.id).add(client);
  user.status = "online";
  client.send({ action: "connected", payload: { user: publicUser(user) } });
  broadcastPresence(user.id);

  socket.on("close", () => removeClient(user.id, client));
  socket.on("end", () => removeClient(user.id, client));
  socket.on("error", () => removeClient(user.id, client));
});

function removeClient(userId, client) {
  const sockets = clients.get(userId);
  if (!sockets) return;
  sockets.delete(client);
  if (sockets.size === 0) {
    clients.delete(userId);
    const user = db.users.find((item) => item.id === userId);
    if (user) user.status = "offline";
    broadcastPresence(userId);
  }
}

function createWsClient(socket, user) {
  let buffer = Buffer.alloc(0);
  const client = {
    send(payload) {
      if (socket.destroyed) return;
      socket.write(encodeWsFrame(JSON.stringify(payload)));
    },
  };

  socket.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    const result = decodeWsFrames(buffer);
    buffer = result.remaining;
    for (const frame of result.frames) {
      if (frame.opcode === 0x8) {
        socket.end();
        return;
      }
      if (frame.opcode === 0x9) {
        socket.write(encodeWsFrame(frame.payload, 0xA));
        continue;
      }
      if (frame.opcode !== 0x1) continue;
      try {
        const packet = JSON.parse(frame.payload.toString("utf8"));
        handleWsPacket(user, client, packet);
      } catch (error) {
        client.send({ action: "error", payload: { message: error.message || "消息格式错误" } });
      }
    }
  });
  return client;
}

function handleWsPacket(user, client, packet) {
  const action = packet.action;
  const payload = packet.payload || {};
  if (action === "heartbeat") {
    client.send({ action: "heartbeat_ack", payload: { at: nowIso() } });
    return;
  }
  if (action === "send_message") {
    const message = createAndSendMessage(user.id, payload);
    client.send({
      action: "message_ack",
      payload: {
        clientId: payload.clientId || null,
        messageId: message.id,
        status: message.deliveredTo?.length ? "delivered" : "sent",
      },
    });
    return;
  }
  if (action === "typing") {
    const type = String(payload.conversationType || "private");
    const targetId = String(payload.targetId || "");
    assertConversationAccess(user.id, type, targetId);
    const convId = conversationId(type, targetId, user.id);
    const recipients = getConversationRecipients(user.id, type, convId).filter((idValue) => idValue !== user.id);
    notifyUsers(recipients, "typing", {
      from: publicUser(user),
      conversationType: type,
      conversationId: convId,
      typing: Boolean(payload.typing),
    });
    return;
  }
  if (action === "read_conversation") {
    const type = String(payload.conversationType || "private");
    const targetId = String(payload.targetId || "");
    assertConversationAccess(user.id, type, targetId);
    const messages = getConversationMessages(type, targetId, user.id);
    for (const message of messages) {
      if (!message.readBy) message.readBy = [];
      if (!message.readBy.includes(user.id)) message.readBy.push(user.id);
    }
    saveDb();
    broadcastReadReceipt(user.id, type, targetId);
  }
}

function encodeWsFrame(data, opcode = 0x1) {
  const payload = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const length = payload.length;
  let header;
  if (length < 126) {
    header = Buffer.alloc(2);
    header[1] = length;
  } else if (length < 65536) {
    header = Buffer.alloc(4);
    header[1] = 126;
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.alloc(10);
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(length), 2);
  }
  header[0] = 0x80 | opcode;
  return Buffer.concat([header, payload]);
}

function decodeWsFrames(buffer) {
  const frames = [];
  let offset = 0;
  while (offset + 2 <= buffer.length) {
    const first = buffer[offset];
    const second = buffer[offset + 1];
    const opcode = first & 0x0f;
    const masked = Boolean(second & 0x80);
    let length = second & 0x7f;
    let cursor = offset + 2;
    if (length === 126) {
      if (cursor + 2 > buffer.length) break;
      length = buffer.readUInt16BE(cursor);
      cursor += 2;
    } else if (length === 127) {
      if (cursor + 8 > buffer.length) break;
      length = Number(buffer.readBigUInt64BE(cursor));
      cursor += 8;
    }
    let mask;
    if (masked) {
      if (cursor + 4 > buffer.length) break;
      mask = buffer.subarray(cursor, cursor + 4);
      cursor += 4;
    }
    if (cursor + length > buffer.length) break;
    const payload = Buffer.from(buffer.subarray(cursor, cursor + length));
    if (masked) {
      for (let index = 0; index < payload.length; index += 1) {
        payload[index] ^= mask[index % 4];
      }
    }
    frames.push({ opcode, payload });
    offset = cursor + length;
  }
  return { frames, remaining: buffer.subarray(offset) };
}

server.listen(PORT, () => {
  console.log(`FlowLink demo running at http://localhost:${PORT}`);
  console.log("Demo accounts: wanghui / flowlink123, guimingyang / flowlink123");
});
