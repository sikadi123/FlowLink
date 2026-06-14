package com.flowlink.controller;

import com.flowlink.common.ApiResponse;
import com.flowlink.domain.User;
import com.flowlink.service.AuthService;
import com.flowlink.service.BootstrapService;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class BootstrapController {
  private final AuthService authService;
  private final BootstrapService bootstrapService;

  public BootstrapController(AuthService authService, BootstrapService bootstrapService) {
    this.authService = authService;
    this.bootstrapService = bootstrapService;
  }

  @GetMapping("/api/bootstrap")
  public ApiResponse<Map<String, Object>> bootstrap(@RequestHeader(value = "Authorization", required = false) String authorization) {
    User user = authService.requireUser(authorization);
    return ApiResponse.ok(bootstrapService.build(user));
  }
}
