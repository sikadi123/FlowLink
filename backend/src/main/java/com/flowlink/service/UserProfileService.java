package com.flowlink.service;

import com.flowlink.domain.User;
import com.flowlink.mapper.UserMapper;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class UserProfileService {
  private final UserMapper userMapper;

  public UserProfileService(UserMapper userMapper) {
    this.userMapper = userMapper;
  }

  public User updateProfile(User current, Map<String, Object> body) {
    current.setDisplayName(text(body, "displayName", current.getDisplayName()));
    current.setUsername(text(body, "username", current.getUsername()));
    current.setEmail(text(body, "email", current.getEmail()));
    current.setAvatarUrl(text(body, "avatarUrl", current.getAvatarUrl()));
    current.setBio(text(body, "bio", current.getBio()));
    current.setRoleTitle(text(body, "role", current.getRoleTitle()));
    current.setDepartment(text(body, "department", current.getDepartment()));
    current.setPhone(text(body, "phone", current.getPhone()));
    current.setLocation(text(body, "location", current.getLocation()));
    current.setStatusMessage(text(body, "statusMessage", current.getStatusMessage()));
    userMapper.updateProfile(current);
    return userMapper.findById(current.getId());
  }

  public List<Map<String, Object>> search(String keyword) {
    String safeKeyword = keyword == null ? "" : keyword.trim();
    return userMapper.search(safeKeyword).stream().map(AuthService::publicUser).toList();
  }

  private String text(Map<String, Object> body, String key, String fallback) {
    Object value = body.get(key);
    if (value == null) return fallback;
    String text = String.valueOf(value).trim();
    return text.isEmpty() ? fallback : text;
  }
}
