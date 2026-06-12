import { store } from "../persistence/store.js";
import { ApiError, avatar, clampText, id, nowIso } from "../shared/utils.js";
import { createNotification, getFriends } from "./socialService.js";
import { publicUser } from "./userService.js";

function getGroup(groupId) {
  return store.db.groups.find((group) => group.id === groupId && group.status !== "dissolved");
}

function assertMember(group, userId) {
  if (!group?.memberIds.includes(userId)) throw new ApiError(403, "你不在该群聊中");
}

function assertManager(group, userId) {
  if (group.ownerId !== userId && !group.admins?.includes(userId)) throw new ApiError(403, "只有群主或管理员可以操作");
}

export function canManageGroup(group, userId) {
  return group?.ownerId === userId || group?.admins?.includes(userId);
}

export function serializeGroup(group, hub = null) {
  return {
    ...group,
    members: group.memberIds.map((memberId) => publicUser(store.db.users.find((user) => user.id === memberId), hub)).filter(Boolean),
    owner: publicUser(store.db.users.find((user) => user.id === group.ownerId), hub),
    conversationType: "group",
    conversationId: group.id,
  };
}

export const groupService = {
  getGroup,

  create(currentUser, body, hub) {
    const name = clampText(body.name, 40);
    if (name.length < 2) throw new ApiError(400, "群名称至少 2 个字符");
    const allowed = new Set([currentUser.id, ...getFriends(currentUser.id).map((friend) => friend.id)]);
    const uniqueMembers = [...new Set([currentUser.id, ...(Array.isArray(body.memberIds) ? body.memberIds : [])])]
      .filter((memberId) => allowed.has(memberId));
    if (uniqueMembers.length < 2) throw new ApiError(400, "至少选择 1 位好友");
    const group = {
      id: id("g"),
      name,
      avatar: avatar(name, body.avatarColor || "#07c160"),
      ownerId: currentUser.id,
      admins: [currentUser.id],
      memberIds: uniqueMembers,
      notice: clampText(body.notice, 160, "新的群聊已创建。"),
      description: clampText(body.description, 200, ""),
      muted: false,
      muteAll: false,
      mutedMembers: [],
      createdAt: nowIso(),
    };
    store.db.groups.push(group);
    store.db.messages.push({
      id: id("m"),
      conversationType: "group",
      conversationId: group.id,
      senderId: currentUser.id,
      content: `${currentUser.displayName} 创建了群聊「${name}」`,
      messageType: "system",
      status: "sent",
      deliveredTo: [],
      readBy: [currentUser.id],
      createdAt: nowIso(),
    });
    for (const memberId of uniqueMembers) {
      if (memberId !== currentUser.id) createNotification(memberId, "group_invite", `${currentUser.displayName} 邀请你加入 ${name}`);
    }
    store.save();
    hub.notifyUsers(uniqueMembers, "group_created", { group: serializeGroup(group, hub) });
    return serializeGroup(group, hub);
  },

  update(currentUser, groupId, body, hub) {
    const group = getGroup(groupId);
    assertMember(group, currentUser.id);
    assertManager(group, currentUser.id);
    const name = clampText(body.name || group.name, 40);
    if (name.length < 2) throw new ApiError(400, "群名称至少 2 个字符");
    group.name = name;
    group.notice = clampText(body.notice ?? group.notice, 160);
    group.description = clampText(body.description ?? group.description, 200);
    if (Object.hasOwn(body, "muted")) group.muted = Boolean(body.muted);
    if (Object.hasOwn(body, "muteAll")) group.muteAll = Boolean(body.muteAll);
    if (body.avatarColor) group.avatar = avatar(name, body.avatarColor);
    group.updatedAt = nowIso();
    store.save();
    hub.notifyUsers(group.memberIds, "group_updated", { group: serializeGroup(group, hub) });
    return serializeGroup(group, hub);
  },

  invite(currentUser, groupId, body, hub) {
    const group = getGroup(groupId);
    assertMember(group, currentUser.id);
    assertManager(group, currentUser.id);
    const allowed = new Set(getFriends(currentUser.id).map((friend) => friend.id));
    const added = [...new Set(Array.isArray(body.memberIds) ? body.memberIds : [])]
      .filter((memberId) => allowed.has(memberId) && !group.memberIds.includes(memberId));
    if (!added.length) throw new ApiError(400, "请选择尚未入群的好友");
    group.memberIds.push(...added);
    for (const memberId of added) createNotification(memberId, "group_invite", `${currentUser.displayName} 邀请你加入 ${group.name}`);
    store.save();
    hub.notifyUsers(group.memberIds, "group_updated", { group: serializeGroup(group, hub) });
    return serializeGroup(group, hub);
  },

  removeMember(currentUser, groupId, memberId, hub) {
    const group = getGroup(groupId);
    assertMember(group, currentUser.id);
    assertManager(group, currentUser.id);
    if (memberId === group.ownerId) throw new ApiError(400, "不能移除群主");
    group.memberIds = group.memberIds.filter((idValue) => idValue !== memberId);
    group.admins = (group.admins || []).filter((idValue) => idValue !== memberId);
    group.mutedMembers = (group.mutedMembers || []).filter((idValue) => idValue !== memberId);
    createNotification(memberId, "group_removed", `你已被移出 ${group.name}`);
    store.save();
    hub.notifyUsers([...group.memberIds, memberId], "group_updated", { group: serializeGroup(group, hub), removedUserId: memberId });
    return serializeGroup(group, hub);
  },

  leave(currentUser, groupId, hub) {
    const group = getGroup(groupId);
    assertMember(group, currentUser.id);
    if (group.ownerId === currentUser.id) throw new ApiError(400, "群主请先解散群聊或转让群主");
    group.memberIds = group.memberIds.filter((idValue) => idValue !== currentUser.id);
    group.admins = (group.admins || []).filter((idValue) => idValue !== currentUser.id);
    group.mutedMembers = (group.mutedMembers || []).filter((idValue) => idValue !== currentUser.id);
    store.save();
    hub.notifyUsers([...group.memberIds, currentUser.id], "group_updated", { group: serializeGroup(group, hub), removedUserId: currentUser.id });
    return true;
  },

  dissolve(currentUser, groupId, hub) {
    const group = getGroup(groupId);
    assertMember(group, currentUser.id);
    if (group.ownerId !== currentUser.id) throw new ApiError(403, "只有群主可以解散群聊");
    group.status = "dissolved";
    group.dissolvedAt = nowIso();
    store.save();
    hub.notifyUsers(group.memberIds, "group_dissolved", { groupId });
    return true;
  },

  setMemberMute(currentUser, groupId, body, hub) {
    const group = getGroup(groupId);
    assertMember(group, currentUser.id);
    assertManager(group, currentUser.id);
    const memberId = String(body.memberId || "");
    if (!group.memberIds.includes(memberId)) throw new ApiError(404, "群成员不存在");
    if (memberId === group.ownerId) throw new ApiError(400, "不能禁言群主");
    if (memberId !== currentUser.id && currentUser.id !== group.ownerId && group.admins?.includes(memberId)) {
      throw new ApiError(403, "只有群主可以禁言管理员");
    }
    group.mutedMembers = group.mutedMembers || [];
    if (body.muted) {
      if (!group.mutedMembers.includes(memberId)) group.mutedMembers.push(memberId);
      createNotification(memberId, "group_muted", `你已在 ${group.name} 中被禁言`);
    } else {
      group.mutedMembers = group.mutedMembers.filter((idValue) => idValue !== memberId);
      createNotification(memberId, "group_unmuted", `你已在 ${group.name} 中解除禁言`);
    }
    group.updatedAt = nowIso();
    store.save();
    hub.notifyUsers(group.memberIds, "group_updated", { group: serializeGroup(group, hub) });
    return serializeGroup(group, hub);
  },
};
