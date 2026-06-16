package com.flowlink.service;

import com.flowlink.domain.ChatGroup;
import com.flowlink.domain.GroupMember;
import com.flowlink.domain.User;
import com.flowlink.mapper.FriendshipMapper;
import com.flowlink.mapper.UserMapper;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class BootstrapService {
  private final FriendshipMapper friendshipMapper;
  private final GroupService groupService;
  private final SocialService socialService;
  private final NotificationService notificationService;
  private final UserMapper userMapper;

  public BootstrapService(FriendshipMapper friendshipMapper, GroupService groupService, SocialService socialService, NotificationService notificationService, UserMapper userMapper) {
    this.friendshipMapper = friendshipMapper;
    this.groupService = groupService;
    this.socialService = socialService;
    this.notificationService = notificationService;
    this.userMapper = userMapper;
  }

  public Map<String, Object> build(User user) {
    List<Map<String, Object>> contacts = friendshipMapper.findFriends(user.getId()).stream()
        .map(AuthService::publicUser)
        .toList();
    List<Map<String, Object>> groups = groupService.myGroups(user.getId()).stream()
        .map(this::groupPayload)
        .toList();
    return Map.of(
        "user", AuthService.publicUser(user),
        "contacts", contacts,
        "groups", groups,
        "requests", socialService.myRequests(user.getId()),
        "notifications", notificationService.list(user.getId()),
        "stats", Map.of("contactCount", contacts.size(), "groupCount", groups.size())
    );
  }

  private Map<String, Object> groupPayload(ChatGroup group) {
    List<GroupMember> groupMembers = groupService.members(group.getId());
    List<Map<String, Object>> members = new ArrayList<>();
    List<Long> admins = new ArrayList<>();
    List<Long> mutedMembers = new ArrayList<>();
    for (GroupMember member : groupMembers) {
      if (member.getRole() != null && member.getRole() >= GroupService.ROLE_ADMIN) admins.add(member.getUserId());
      if (Boolean.TRUE.equals(member.getMuted())) mutedMembers.add(member.getUserId());
      User user = userMapper.findById(member.getUserId());
      Map<String, Object> payload = user == null ? new LinkedHashMap<>() : AuthService.publicUser(user);
      payload.put("groupRole", member.getRole());
      payload.put("groupNickname", member.getNicknameInGroup() == null ? "" : member.getNicknameInGroup());
      payload.put("muted", Boolean.TRUE.equals(member.getMuted()));
      members.add(payload);
    }
    Map<String, Object> payload = new LinkedHashMap<>();
    payload.put("id", group.getId());
    payload.put("conversationId", group.getId());
    payload.put("conversationType", "group");
    payload.put("name", group.getGroupName() == null ? "" : group.getGroupName());
    payload.put("ownerId", group.getOwnerId());
    payload.put("avatarUrl", group.getAvatarUrl() == null ? "" : group.getAvatarUrl());
    payload.put("notice", group.getNotice() == null ? "" : group.getNotice());
    payload.put("description", group.getDescription() == null ? "" : group.getDescription());
    payload.put("muteAll", Boolean.TRUE.equals(group.getMuteAll()));
    payload.put("members", members);
    payload.put("admins", admins);
    payload.put("mutedMembers", mutedMembers);
    return payload;
  }
}
