package com.flowlink.domain;

import java.time.LocalDateTime;

public class User {
  private Long id;
  private String username;
  private String email;
  private String passwordHash;
  private String displayName;
  private String avatarUrl;
  private String bio;
  private String roleTitle;
  private String department;
  private String phone;
  private String location;
  private String statusMessage;
  private Integer status;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public String getUsername() { return username; }
  public void setUsername(String username) { this.username = username; }
  public String getEmail() { return email; }
  public void setEmail(String email) { this.email = email; }
  public String getPasswordHash() { return passwordHash; }
  public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
  public String getDisplayName() { return displayName; }
  public void setDisplayName(String displayName) { this.displayName = displayName; }
  public String getAvatarUrl() { return avatarUrl; }
  public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
  public String getBio() { return bio; }
  public void setBio(String bio) { this.bio = bio; }
  public String getRoleTitle() { return roleTitle; }
  public void setRoleTitle(String roleTitle) { this.roleTitle = roleTitle; }
  public String getDepartment() { return department; }
  public void setDepartment(String department) { this.department = department; }
  public String getPhone() { return phone; }
  public void setPhone(String phone) { this.phone = phone; }
  public String getLocation() { return location; }
  public void setLocation(String location) { this.location = location; }
  public String getStatusMessage() { return statusMessage; }
  public void setStatusMessage(String statusMessage) { this.statusMessage = statusMessage; }
  public Integer getStatus() { return status; }
  public void setStatus(Integer status) { this.status = status; }
  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
  public LocalDateTime getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
