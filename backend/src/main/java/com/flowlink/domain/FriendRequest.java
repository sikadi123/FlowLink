package com.flowlink.domain;

import java.time.LocalDateTime;

public class FriendRequest {
  private Long id;
  private Long senderId;
  private Long receiverId;
  private String message;
  private Integer status;
  private LocalDateTime requestTime;
  private LocalDateTime handleTime;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public Long getSenderId() { return senderId; }
  public void setSenderId(Long senderId) { this.senderId = senderId; }
  public Long getReceiverId() { return receiverId; }
  public void setReceiverId(Long receiverId) { this.receiverId = receiverId; }
  public String getMessage() { return message; }
  public void setMessage(String message) { this.message = message; }
  public Integer getStatus() { return status; }
  public void setStatus(Integer status) { this.status = status; }
  public LocalDateTime getRequestTime() { return requestTime; }
  public void setRequestTime(LocalDateTime requestTime) { this.requestTime = requestTime; }
  public LocalDateTime getHandleTime() { return handleTime; }
  public void setHandleTime(LocalDateTime handleTime) { this.handleTime = handleTime; }
}
