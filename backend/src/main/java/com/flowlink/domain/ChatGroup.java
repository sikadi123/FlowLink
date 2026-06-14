package com.flowlink.domain;

import java.time.LocalDateTime;

public class ChatGroup {
  private Long id;
  private String groupName;
  private Long ownerId;
  private String avatarUrl;
  private String notice;
  private String description;
  private Integer maxMember;
  private Boolean muted;
  private Boolean muteAll;
  private Integer status;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public String getGroupName() { return groupName; }
  public void setGroupName(String groupName) { this.groupName = groupName; }
  public Long getOwnerId() { return ownerId; }
  public void setOwnerId(Long ownerId) { this.ownerId = ownerId; }
  public String getAvatarUrl() { return avatarUrl; }
  public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
  public String getNotice() { return notice; }
  public void setNotice(String notice) { this.notice = notice; }
  public String getDescription() { return description; }
  public void setDescription(String description) { this.description = description; }
  public Integer getMaxMember() { return maxMember; }
  public void setMaxMember(Integer maxMember) { this.maxMember = maxMember; }
  public Boolean getMuted() { return muted; }
  public void setMuted(Boolean muted) { this.muted = muted; }
  public Boolean getMuteAll() { return muteAll; }
  public void setMuteAll(Boolean muteAll) { this.muteAll = muteAll; }
  public Integer getStatus() { return status; }
  public void setStatus(Integer status) { this.status = status; }
  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
  public LocalDateTime getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
