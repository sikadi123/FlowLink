package com.flowlink.controller;

import com.flowlink.common.ApiResponse;
import com.flowlink.domain.FriendRequest;
import com.flowlink.domain.User;
import com.flowlink.service.AuthService;
import com.flowlink.service.SocialService;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/friends")
public class SocialController {
  private final AuthService authService;
  private final SocialService socialService;

  public SocialController(AuthService authService, SocialService socialService) {
    this.authService = authService;
    this.socialService = socialService;
  }

  @PostMapping("/request")
  public ApiResponse<FriendRequest> request(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @RequestBody Map<String, Object> body
  ) {
    User user = authService.requireUser(authorization);
    Long toId = Long.valueOf(String.valueOf(body.get("toId")));
    return ApiResponse.ok(socialService.sendRequest(user, toId, String.valueOf(body.getOrDefault("message", ""))));
  }

  @PostMapping("/respond")
  public ApiResponse<Boolean> respond(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @RequestBody Map<String, Object> body
  ) {
    User user = authService.requireUser(authorization);
    Long requestId = Long.valueOf(String.valueOf(body.get("requestId")));
    socialService.respond(user, requestId, String.valueOf(body.getOrDefault("action", "reject")));
    return ApiResponse.ok(true);
  }

  @DeleteMapping("/{friendId}")
  public ApiResponse<Boolean> deleteFriend(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @PathVariable Long friendId
  ) {
    User user = authService.requireUser(authorization);
    socialService.deleteFriend(user, friendId);
    return ApiResponse.ok(true);
  }
}
