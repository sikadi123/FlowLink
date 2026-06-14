package com.flowlink.controller;

import com.flowlink.common.ApiResponse;
import com.flowlink.domain.ChatGroup;
import com.flowlink.domain.User;
import com.flowlink.service.AuthService;
import com.flowlink.service.GroupService;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/groups")
public class GroupController {
  private final AuthService authService;
  private final GroupService groupService;

  public GroupController(AuthService authService, GroupService groupService) {
    this.authService = authService;
    this.groupService = groupService;
  }

  @PostMapping
  public ApiResponse<ChatGroup> create(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @RequestBody Map<String, Object> body
  ) {
    User user = authService.requireUser(authorization);
    ChatGroup group = new ChatGroup();
    group.setGroupName(String.valueOf(body.getOrDefault("name", "新群聊")));
    group.setNotice(String.valueOf(body.getOrDefault("notice", "")));
    group.setDescription(String.valueOf(body.getOrDefault("description", "")));
    group.setAvatarUrl(String.valueOf(body.getOrDefault("avatarUrl", "")));
    group.setMuteAll(Boolean.valueOf(String.valueOf(body.getOrDefault("muteAll", "false"))));
    List<Long> memberIds = ((List<?>) body.getOrDefault("memberIds", List.of())).stream()
        .map(value -> Long.valueOf(String.valueOf(value)))
        .toList();
    return ApiResponse.ok(groupService.create(user.getId(), group, memberIds));
  }

  @PatchMapping("/{id}")
  public ApiResponse<ChatGroup> update(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @PathVariable Long id,
      @RequestBody Map<String, Object> body
  ) {
    User user = authService.requireUser(authorization);
    ChatGroup patch = new ChatGroup();
    patch.setGroupName(String.valueOf(body.getOrDefault("name", "")));
    patch.setNotice(String.valueOf(body.getOrDefault("notice", "")));
    patch.setDescription(String.valueOf(body.getOrDefault("description", "")));
    patch.setAvatarUrl(String.valueOf(body.getOrDefault("avatarUrl", "")));
    patch.setMuteAll(Boolean.valueOf(String.valueOf(body.getOrDefault("muteAll", "false"))));
    return ApiResponse.ok(groupService.update(user.getId(), id, patch));
  }

  @PostMapping("/{id}/mutes")
  public ApiResponse<Boolean> mute(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @PathVariable Long id,
      @RequestBody Map<String, Object> body
  ) {
    User user = authService.requireUser(authorization);
    Long memberId = Long.valueOf(String.valueOf(body.get("memberId")));
    boolean muted = Boolean.parseBoolean(String.valueOf(body.getOrDefault("muted", "true")));
    groupService.setMemberMute(user.getId(), id, memberId, muted);
    return ApiResponse.ok(true);
  }

  @PostMapping("/{id}/admins")
  public ApiResponse<Boolean> admin(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @PathVariable Long id,
      @RequestBody Map<String, Object> body
  ) {
    User user = authService.requireUser(authorization);
    Long memberId = Long.valueOf(String.valueOf(body.get("memberId")));
    boolean admin = Boolean.parseBoolean(String.valueOf(body.getOrDefault("admin", "true")));
    groupService.setAdmin(user.getId(), id, memberId, admin);
    return ApiResponse.ok(true);
  }

  @PostMapping("/{id}/owner")
  public ApiResponse<Boolean> owner(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @PathVariable Long id,
      @RequestBody Map<String, Object> body
  ) {
    User user = authService.requireUser(authorization);
    Long memberId = Long.valueOf(String.valueOf(body.get("memberId")));
    groupService.transferOwner(user.getId(), id, memberId);
    return ApiResponse.ok(true);
  }
}
