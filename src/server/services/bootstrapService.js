import { store } from "../persistence/store.js";
import { serializeGroup } from "./groupService.js";
import { getFriends } from "./socialService.js";
import { publicUser } from "./userService.js";
import { messageService } from "./messageService.js";

export function buildBootstrap(currentUser, hub) {
  const contacts = getFriends(currentUser.id).map((friend) => ({
    ...publicUser(friend, hub),
    conversationType: "private",
    conversationId: messageService.conversationId("private", friend.id, currentUser.id),
    lastMessage: messageService.lastMessage("private", friend.id, currentUser.id),
    unread: messageService.unread("private", friend.id, currentUser.id),
  }));

  const groups = store.db.groups
    .filter((group) => group.status !== "dissolved" && group.memberIds.includes(currentUser.id))
    .map((group) => ({
      ...serializeGroup(group, hub),
      lastMessage: messageService.lastMessage("group", group.id, currentUser.id),
      unread: messageService.unread("group", group.id, currentUser.id),
    }));

  const requests = store.db.friendRequests
    .filter((request) => request.toId === currentUser.id || request.fromId === currentUser.id)
    .map((request) => ({
      ...request,
      from: publicUser(store.db.users.find((user) => user.id === request.fromId), hub),
      to: publicUser(store.db.users.find((user) => user.id === request.toId), hub),
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return {
    user: publicUser(currentUser, hub),
    contacts,
    groups,
    requests,
    notifications: store.db.notifications
      .filter((item) => item.receiverId === currentUser.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 20),
    stats: {
      users: store.db.users.length,
      friendships: store.db.friendships.length,
      groups: store.db.groups.filter((group) => group.status !== "dissolved").length,
      messages: store.db.messages.length,
      files: store.db.fileRecords.length,
      online: hub.onlineCount(),
    },
  };
}
