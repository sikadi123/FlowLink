package com.flowlink.controller;

import com.flowlink.common.ApiResponse;
import com.flowlink.service.AuthService;
import java.util.Map;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
  private final AuthService authService;

  public AuthController(AuthService authService) {
    this.authService = authService;
  }

  @PostMapping("/login")
  public ApiResponse<Map<String, Object>> login(@RequestBody Map<String, String> body) {
    return ApiResponse.ok(authService.login(body.getOrDefault("account", ""), body.getOrDefault("password", "")));
  }

  @PostMapping("/register")
  public ApiResponse<Map<String, Object>> register(@RequestBody Map<String, String> body) {
    return ApiResponse.ok(authService.register(body));
  }

  @PostMapping("/logout")
  public ApiResponse<Boolean> logout(@RequestHeader(value = "Authorization", required = false) String authorization) {
    authService.logout(authService.tokenOf(authorization));
    return ApiResponse.ok(true);
  }
}
