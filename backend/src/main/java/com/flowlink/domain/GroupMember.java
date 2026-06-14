package com.flowlink.domain;

import java.time.LocalDateTime;

public class GroupMember {
  private Long id;
  private Long groupId;
  private Long userId;
  private Integer role;
  private String nicknameInGroup;
  private Boolean muted;
  private Long mutedBy;
  private LocalDateTime mutedUntil;
  private LocalDateTime joinTime;
  private Integer status;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public Long getGroupId() { return groupId; }
  public void setGroupId(Long groupId) { this.groupId = groupId; }
  public Long getUserId() { return userId; }
  public void setUserId(Long userId) { this.userId = userId; }
  public Integer getRole() { return role; }
  public void setRole(Integer role) { this.role = role; }
  public String getNicknameInGroup() { return nicknameInGroup; }
  public void setNicknameInGroup(String nicknameInGroup) { this.nicknameInGroup = nicknameInGroup; }
  public Boolean getMuted() { return muted; }
  public void setMuted(Boolean muted) { this.muted = muted; }
  public Long getMutedBy() { return mutedBy; }
  public void setMutedBy(Long mutedBy) { this.mutedBy = mutedBy; }
  public LocalDateTime getMutedUntil() { return mutedUntil; }
  public void setMutedUntil(LocalDateTime mutedUntil) { this.mutedUntil = mutedUntil; }
  public LocalDateTime getJoinTime() { return joinTime; }
  public void setJoinTime(LocalDateTime joinTime) { this.joinTime = joinTime; }
  public Integer getStatus() { return status; }
  public void setStatus(Integer status) { this.status = status; }
}
