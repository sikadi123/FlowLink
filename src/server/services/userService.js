import { store } from "../persistence/store.js";
import { ApiError, avatar, clampText, hashPassword, id, nowIso, verifyPassword } from "../shared/utils.js";

export function isOnline(userId, hub) {
  return hub?.isOnline(userId) || false;
}

export function publicUser(user, hub = null) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    department: user.department || "",
    phone: user.phone || "",
    location: user.location || "",
    statusMessage: user.statusMessage || "",
    bio: user.bio || "",
    avatar: user.avatar,
    status: isOnline(user.id, hub) ? "online" : "offline",
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function requireAuth(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const session = store.db.sessions[token];
  const user = session ? store.db.users.find((item) => item.id === session.userId) : null;
  if (!user) throw new ApiError(401, "请先登录");
  return { token, user };
}

export const userService = {
  login({ account, password }, hub) {
    const normalized = String(account || "").trim().toLowerCase();
    const user = store.db.users.find((item) => {
      return (
        item.username.toLowerCase() === normalized ||
        item.email.toLowerCase() === normalized ||
        item.displayName.toLowerCase() === normalized
      );
    });
    if (!user || !verifyPassword(String(password || ""), user.password)) {
      throw new ApiError(401, "账号或密码错误");
    }
    const token = id("tok");
    store.db.sessions[token] = { userId: user.id, createdAt: nowIso() };
    store.save();
    return { token, user: publicUser(user, hub) };
  },

  register(body) {
    const username = clampText(body.username, 20);
    const email = clampText(body.email, 100).toLowerCase();
    const displayName = clampText(body.displayName || username, 20);
    const password = String(body.password || "");
    if (!/^[a-zA-Z0-9_]{4,20}$/.test(username)) throw new ApiError(400, "用户名需要 4-20 位字母、数字或下划线");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, "邮箱格式不正确");
    if (password.length < 8) throw new ApiError(400, "密码至少 8 位");
    if (store.db.users.some((user) => user.username.toLowerCase() === username.toLowerCase())) {
      throw new ApiError(409, "用户名已存在");
    }
    if (store.db.users.some((user) => user.email.toLowerCase() === email)) throw new ApiError(409, "邮箱已存在");

    const palette = ["#07c160", "#2f80ed", "#7c3aed", "#f97316", "#0f766e", "#e11d48"];
    const user = {
      id: id("u"),
      username,
      email,
      displayName,
      role: "FlowLink 用户",
      department: "未设置",
      phone: "",
      location: "",
      statusMessage: "新的连接正在建立。",
      bio: "新的连接正在建立。",
      avatar: avatar(displayName, palette[store.db.users.length % palette.length]),
      password: hashPassword(password),
      status: "offline",
      createdAt: nowIso(),
    };
    store.db.users.push(user);
    store.save();
    return publicUser(user);
  },

  logout(token) {
    delete store.db.sessions[token];
    store.save();
  },

  updateProfile(user, body) {
    const displayName = clampText(body.displayName || user.displayName, 20);
    if (!displayName) throw new ApiError(400, "昵称不能为空");
    const username = clampText(body.username || user.username, 20);
    if (!/^[a-zA-Z0-9_]{4,20}$/.test(username)) throw new ApiError(400, "用户名需要 4-20 位字母、数字或下划线");
    if (store.db.users.some((item) => item.id !== user.id && item.username.toLowerCase() === username.toLowerCase())) {
      throw new ApiError(409, "用户名已存在");
    }
    const email = clampText(body.email || user.email, 100).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, "邮箱格式不正确");
    if (store.db.users.some((item) => item.id !== user.id && item.email.toLowerCase() === email)) {
      throw new ApiError(409, "邮箱已存在");
    }
    const avatarColor = /^#[0-9a-fA-F]{6}$/.test(body.avatarColor || "") ? body.avatarColor : user.avatar?.background || "#07c160";
    Object.assign(user, {
      username,
      email,
      displayName,
      role: clampText(body.role || "", 30, user.role),
      department: clampText(body.department || "", 30, user.department),
      phone: clampText(body.phone || "", 30, user.phone),
      location: clampText(body.location || "", 30, user.location),
      statusMessage: clampText(body.statusMessage || "", 80, user.statusMessage),
      bio: clampText(body.bio || "", 160, user.bio),
      avatar: avatar(displayName, avatarColor),
      updatedAt: nowIso(),
    });
    store.db.adminLogs.push({
      id: id("log"),
      adminId: user.id,
      operationType: "UPDATE_PROFILE",
      targetUserId: user.id,
      operationDetail: "用户更新个人资料",
      operationTime: nowIso(),
    });
    store.save();
    return publicUser(user);
  },
};
