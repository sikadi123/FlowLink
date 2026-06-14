package com.flowlink.service;

import com.flowlink.common.BusinessException;
import com.flowlink.domain.User;
import com.flowlink.mapper.UserMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
  private final UserMapper userMapper;
  private final RedisStateService redisStateService;

  public AuthService(UserMapper userMapper, RedisStateService redisStateService) {
    this.userMapper = userMapper;
    this.redisStateService = redisStateService;
  }

  public Map<String, Object> login(String account, String password) {
    User user = userMapper.findByAccount(account);
    if (user == null || !matches(password, user.getPasswordHash())) throw new BusinessException(401, "账号或密码错误");
    String token = "tok_" + UUID.randomUUID().toString().replace("-", "");
    redisStateService.saveSession(token, user.getId());
    userMapper.updateStatus(user.getId(), 3);
    return Map.of("token", token, "user", publicUser(user));
  }

  public void logout(String token) {
    Long userId = redisStateService.getSessionUser(token);
    redisStateService.removeSession(token);
    if (userId != null) userMapper.updateStatus(userId, 2);
  }

  public User requireUser(String authorization) {
    String token = tokenOf(authorization);
    Long userId = redisStateService.getSessionUser(token);
    if (userId == null) throw new BusinessException(401, "请先登录");
    User user = userMapper.findById(userId);
    if (user == null) throw new BusinessException(401, "用户不存在");
    return user;
  }

  public String tokenOf(String authorization) {
    if (authorization == null || authorization.isBlank()) return "";
    return authorization.startsWith("Bearer ") ? authorization.substring(7) : authorization;
  }

  public static Map<String, Object> publicUser(User user) {
    return Map.of(
        "id", user.getId(),
        "username", nullToEmpty(user.getUsername()),
        "email", nullToEmpty(user.getEmail()),
        "displayName", nullToEmpty(user.getDisplayName()),
        "avatarUrl", nullToEmpty(user.getAvatarUrl()),
        "bio", nullToEmpty(user.getBio()),
        "role", nullToEmpty(user.getRoleTitle()),
        "department", nullToEmpty(user.getDepartment()),
        "phone", nullToEmpty(user.getPhone()),
        "location", nullToEmpty(user.getLocation()),
        "statusMessage", nullToEmpty(user.getStatusMessage()),
        "status", user.getStatus() != null && user.getStatus() == 3 ? "online" : "offline"
    );
  }

  private boolean matches(String password, String stored) {
    if (stored != null && stored.startsWith("demo:")) return stored.substring(5).equals(password);
    return sha256(password).equals(stored);
  }

  private String sha256(String value) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
    } catch (Exception error) {
      throw new IllegalStateException(error);
    }
  }

  private static String nullToEmpty(String value) {
    return value == null ? "" : value;
  }
}
