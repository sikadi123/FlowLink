package com.flowlink.domain;

import java.time.LocalDateTime;

public class Notification {
  private Long id;
  private Long receiverId;
  private String type;
  private String content;
  private Boolean read;
  private LocalDateTime createdAt;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public Long getReceiverId() { return receiverId; }
  public void setReceiverId(Long receiverId) { this.receiverId = receiverId; }
  public String getType() { return type; }
  public void setType(String type) { this.type = type; }
  public String getContent() { return content; }
  public void setContent(String content) { this.content = content; }
  public Boolean getRead() { return read; }
  public void setRead(Boolean read) { this.read = read; }
  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
