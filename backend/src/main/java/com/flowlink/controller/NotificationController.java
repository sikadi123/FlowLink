package com.flowlink.controller;

import com.flowlink.common.ApiResponse;
import com.flowlink.domain.Notification;
import com.flowlink.domain.User;
import com.flowlink.service.AuthService;
import com.flowlink.service.NotificationService;
import java.util.List;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
  private final AuthService authService;
  private final NotificationService notificationService;

  public NotificationController(AuthService authService, NotificationService notificationService) {
    this.authService = authService;
    this.notificationService = notificationService;
  }

  @GetMapping
  public ApiResponse<List<Notification>> list(
      @RequestHeader(value = "Authorization", required = false) String authorization
  ) {
    User user = authService.requireUser(authorization);
    return ApiResponse.ok(notificationService.list(user.getId()));
  }

  @PatchMapping("/read-all")
  public ApiResponse<Boolean> readAll(
      @RequestHeader(value = "Authorization", required = false) String authorization
  ) {
    User user = authService.requireUser(authorization);
    notificationService.markAllRead(user.getId());
    return ApiResponse.ok(true);
  }

  @DeleteMapping("/{id}")
  public ApiResponse<Boolean> deleteOne(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @PathVariable("id") Long id
  ) {
    User user = authService.requireUser(authorization);
    notificationService.deleteOne(user.getId(), id);
    return ApiResponse.ok(true);
  }

  @DeleteMapping
  public ApiResponse<Boolean> deleteAll(
      @RequestHeader(value = "Authorization", required = false) String authorization
  ) {
    User user = authService.requireUser(authorization);
    notificationService.deleteAll(user.getId());
    return ApiResponse.ok(true);
  }
}
