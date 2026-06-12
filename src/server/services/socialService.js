import { store } from "../persistence/store.js";
import { ApiError, id, nowIso } from "../shared/utils.js";
import { publicUser } from "./userService.js";

export function areFriends(a, b) {
  return store.db.friendships.some((item) => item.users.includes(a) && item.users.includes(b));
}

export function getFriends(userId) {
  const friendIds = store.db.friendships
    .filter((item) => item.users.includes(userId))
    .map((item) => item.users.find((value) => value !== userId));
  return store.db.users.filter((user) => friendIds.includes(user.id));
}

export function createNotification(receiverId, type, content) {
  store.db.notifications.push({
    id: id("ntf"),
    receiverId,
    type,
    content,
    isRead: false,
    createdAt: nowIso(),
  });
}

export const socialService = {
  searchUsers(currentUser, q, hub) {
    const keyword = String(q || "").trim().toLowerCase();
    const friendIds = new Set(getFriends(currentUser.id).map((friend) => friend.id));
    return store.db.users
      .filter((user) => user.id !== currentUser.id)
      .filter((user) => {
        if (!keyword) return true;
        return (
          user.username.toLowerCase().includes(keyword) ||
          user.email.toLowerCase().includes(keyword) ||
          user.displayName.toLowerCase().includes(keyword)
        );
      })
      .slice(0, 30)
      .map((user) => ({
        ...publicUser(user, hub),
        isFriend: friendIds.has(user.id),
        requestPending: store.db.friendRequests.some(
          (request) =>
            request.status === "pending" &&
            ((request.fromId === currentUser.id && request.toId === user.id) ||
              (request.fromId === user.id && request.toId === currentUser.id))
        ),
      }));
  },

  sendFriendRequest(currentUser, body, hub) {
    const toId = String(body.toId || "");
    const target = store.db.users.find((user) => user.id === toId);
    if (!target || target.id === currentUser.id) throw new ApiError(404, "用户不存在");
    if (areFriends(currentUser.id, toId)) throw new ApiError(409, "你们已经是好友");
    const existing = store.db.friendRequests.find(
      (request) =>
        request.status === "pending" &&
        ((request.fromId === currentUser.id && request.toId === toId) ||
          (request.fromId === toId && request.toId === currentUser.id))
    );
    if (existing) throw new ApiError(409, "已有待处理的好友申请");
    const request = {
      id: id("req"),
      fromId: currentUser.id,
      toId,
      status: "pending",
      message: String(body.message || "希望添加你为好友").slice(0, 120),
      createdAt: nowIso(),
    };
    store.db.friendRequests.push(request);
    createNotification(toId, "friend_request", `${currentUser.displayName} 请求添加你为好友`);
    store.save();
    hub.notifyUsers([toId], "friend_request", {
      request: { ...request, from: publicUser(currentUser, hub), to: publicUser(target, hub) },
    });
    return request;
  },

  respondFriendRequest(currentUser, body, hub) {
    const request = store.db.friendRequests.find((item) => item.id === body.requestId);
    if (!request || request.toId !== currentUser.id || request.status !== "pending") {
      throw new ApiError(404, "好友申请不存在");
    }
    request.status = body.action === "accept" ? "accepted" : "rejected";
    request.updatedAt = nowIso();
    if (request.status === "accepted" && !areFriends(request.fromId, request.toId)) {
      store.db.friendships.push({ id: id("fr"), users: [request.fromId, request.toId], createdAt: nowIso() });
      createNotification(request.fromId, "friend_accepted", `${currentUser.displayName} 已通过你的好友申请`);
    }
    store.save();
    hub.notifyUsers([request.fromId, request.toId], "friend_request_updated", { request });
    return request;
  },
};
