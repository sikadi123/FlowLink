package com.flowlink.service;

import com.flowlink.common.BusinessException;
import com.flowlink.domain.User;
import com.flowlink.mapper.UserMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.LinkedHashMap;
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

  public Map<String, Object> register(Map<String, String> body) {
    String username = text(body.get("username"));
    String email = text(body.get("email"));
    String password = text(body.get("password"));
    String displayName = text(body.get("displayName"));
    if (username.isBlank() || password.length() < 6) throw new BusinessException(400, "账号不能为空，密码至少 6 位");
    if (displayName.isBlank()) displayName = username;
    if (email.isBlank()) email = null;
    if (userMapper.countByUsernameOrEmail(username, email) > 0) throw new BusinessException(409, "账号或邮箱已存在");

    User user = new User();
    user.setUsername(username);
    user.setEmail(email);
    user.setPasswordHash(sha256(password));
    user.setDisplayName(displayName);
    user.setAvatarUrl("");
    user.setBio("");
    user.setRoleTitle("新成员");
    user.setDepartment("FlowLink");
    user.setPhone("");
    user.setLocation("");
    user.setStatusMessage("刚刚加入 FlowLink");
    user.setStatus(2);
    userMapper.insert(user);
    return login(username, password);
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
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("id", user.getId());
    result.put("username", nullToEmpty(user.getUsername()));
    result.put("email", nullToEmpty(user.getEmail()));
    result.put("displayName", nullToEmpty(user.getDisplayName()));
    result.put("avatarUrl", nullToEmpty(user.getAvatarUrl()));
    result.put("bio", nullToEmpty(user.getBio()));
    result.put("role", nullToEmpty(user.getRoleTitle()));
    result.put("department", nullToEmpty(user.getDepartment()));
    result.put("phone", nullToEmpty(user.getPhone()));
    result.put("location", nullToEmpty(user.getLocation()));
    result.put("statusMessage", nullToEmpty(user.getStatusMessage()));
    result.put("status", user.getStatus() != null && user.getStatus() == 3 ? "online" : "offline");
    return result;
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

  private String text(String value) {
    return value == null ? "" : value.trim();
  }
}
