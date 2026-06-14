package com.flowlink.controller;

import com.flowlink.common.ApiResponse;
import com.flowlink.domain.User;
import com.flowlink.service.AuthService;
import com.flowlink.service.SocialService;
import com.flowlink.service.UserProfileService;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class UserController {
  private final AuthService authService;
  private final UserProfileService profileService;
  private final SocialService socialService;

  public UserController(AuthService authService, UserProfileService profileService, SocialService socialService) {
    this.authService = authService;
    this.profileService = profileService;
    this.socialService = socialService;
  }

  @PatchMapping("/api/me")
  public ApiResponse<Map<String, Object>> updateMe(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @RequestBody Map<String, Object> body
  ) {
    User user = authService.requireUser(authorization);
    return ApiResponse.ok(AuthService.publicUser(profileService.updateProfile(user, body)));
  }

  @GetMapping("/api/users")
  public ApiResponse<List<Map<String, Object>>> users(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @RequestParam(defaultValue = "") String q
  ) {
    User user = authService.requireUser(authorization);
    return ApiResponse.ok(socialService.searchUsers(user, q));
  }
}
