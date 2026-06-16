package com.flowlink.controller;

import com.flowlink.common.ApiResponse;
import com.flowlink.domain.ChatGroup;
import com.flowlink.domain.GroupMember;
import com.flowlink.domain.User;
import com.flowlink.service.AuthService;
import com.flowlink.service.GroupService;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
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
      @PathVariable("id") Long id,
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
      @PathVariable("id") Long id,
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
      @PathVariable("id") Long id,
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
      @PathVariable("id") Long id,
      @RequestBody Map<String, Object> body
  ) {
    User user = authService.requireUser(authorization);
    Long memberId = Long.valueOf(String.valueOf(body.get("memberId")));
    groupService.transferOwner(user.getId(), id, memberId);
    return ApiResponse.ok(true);
  }

  @PostMapping("/{id}/members")
  public ApiResponse<Boolean> invite(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @PathVariable("id") Long id,
      @RequestBody Map<String, Object> body
  ) {
    User user = authService.requireUser(authorization);
    List<Long> memberIds = ((List<?>) body.getOrDefault("memberIds", List.of())).stream()
        .map(value -> Long.valueOf(String.valueOf(value)))
        .toList();
    groupService.invite(user.getId(), id, memberIds);
    return ApiResponse.ok(true);
  }

  @PatchMapping("/{id}/my-nickname")
  public ApiResponse<Boolean> updateMyNickname(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @PathVariable("id") Long id,
      @RequestBody Map<String, Object> body
  ) {
    User user = authService.requireUser(authorization);
    groupService.updateMyNickname(user.getId(), id, String.valueOf(body.getOrDefault("nickname", "")));
    return ApiResponse.ok(true);
  }

  @GetMapping("/{id}/members")
  public ApiResponse<List<GroupMember>> members(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @PathVariable("id") Long id
  ) {
    User user = authService.requireUser(authorization);
    groupService.requireMember(id, user.getId());
    return ApiResponse.ok(groupService.members(id));
  }

  @DeleteMapping("/{id}/members/{memberId}")
  public ApiResponse<Boolean> removeMember(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @PathVariable("id") Long id,
      @PathVariable("memberId") Long memberId
  ) {
    User user = authService.requireUser(authorization);
    groupService.removeMember(user.getId(), id, memberId);
    return ApiResponse.ok(true);
  }

  @PostMapping("/{id}/leave")
  public ApiResponse<Boolean> leave(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @PathVariable("id") Long id
  ) {
    User user = authService.requireUser(authorization);
    groupService.leave(user.getId(), id);
    return ApiResponse.ok(true);
  }

  @DeleteMapping("/{id}")
  public ApiResponse<Boolean> dissolve(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @PathVariable("id") Long id
  ) {
    User user = authService.requireUser(authorization);
    groupService.dissolve(user.getId(), id);
    return ApiResponse.ok(true);
  }
}
