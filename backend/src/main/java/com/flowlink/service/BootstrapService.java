package com.flowlink.service;

import com.flowlink.domain.ChatGroup;
import com.flowlink.domain.User;
import com.flowlink.mapper.FriendshipMapper;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class BootstrapService {
  private final FriendshipMapper friendshipMapper;
  private final GroupService groupService;

  public BootstrapService(FriendshipMapper friendshipMapper, GroupService groupService) {
    this.friendshipMapper = friendshipMapper;
    this.groupService = groupService;
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
        "requests", List.of(),
        "notifications", List.of(),
        "stats", Map.of("contactCount", contacts.size(), "groupCount", groups.size())
    );
  }

  private Map<String, Object> groupPayload(ChatGroup group) {
    return Map.of(
        "id", group.getId(),
        "conversationId", group.getId(),
        "conversationType", "group",
        "name", group.getGroupName() == null ? "" : group.getGroupName(),
        "ownerId", group.getOwnerId(),
        "avatarUrl", group.getAvatarUrl() == null ? "" : group.getAvatarUrl(),
        "notice", group.getNotice() == null ? "" : group.getNotice(),
        "description", group.getDescription() == null ? "" : group.getDescription(),
        "muteAll", Boolean.TRUE.equals(group.getMuteAll())
    );
  }
}
