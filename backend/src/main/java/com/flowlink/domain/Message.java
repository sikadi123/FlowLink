package com.flowlink.domain;

import java.time.LocalDateTime;

public class Message {
  private Long id;
  private Integer conversationType;
  private Long senderId;
  private Long receiverId;
  private Long groupId;
  private String content;
  private Integer messageType;
  private String clientId;
  private LocalDateTime sendTime;
  private Boolean recalled;
  private LocalDateTime recallTime;
  private Long fileRecordId;
  private String fileName;
  private Long fileSize;
  private String fileType;
  private String fileUrl;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public Integer getConversationType() { return conversationType; }
  public void setConversationType(Integer conversationType) { this.conversationType = conversationType; }
  public Long getSenderId() { return senderId; }
  public void setSenderId(Long senderId) { this.senderId = senderId; }
  public Long getReceiverId() { return receiverId; }
  public void setReceiverId(Long receiverId) { this.receiverId = receiverId; }
  public Long getGroupId() { return groupId; }
  public void setGroupId(Long groupId) { this.groupId = groupId; }
  public String getContent() { return content; }
  public void setContent(String content) { this.content = content; }
  public Integer getMessageType() { return messageType; }
  public void setMessageType(Integer messageType) { this.messageType = messageType; }
  public String getClientId() { return clientId; }
  public void setClientId(String clientId) { this.clientId = clientId; }
  public LocalDateTime getSendTime() { return sendTime; }
  public void setSendTime(LocalDateTime sendTime) { this.sendTime = sendTime; }
  public Boolean getRecalled() { return recalled; }
  public void setRecalled(Boolean recalled) { this.recalled = recalled; }
  public LocalDateTime getRecallTime() { return recallTime; }
  public void setRecallTime(LocalDateTime recallTime) { this.recallTime = recallTime; }
  public Long getFileRecordId() { return fileRecordId; }
  public void setFileRecordId(Long fileRecordId) { this.fileRecordId = fileRecordId; }
  public String getFileName() { return fileName; }
  public void setFileName(String fileName) { this.fileName = fileName; }
  public Long getFileSize() { return fileSize; }
  public void setFileSize(Long fileSize) { this.fileSize = fileSize; }
  public String getFileType() { return fileType; }
  public void setFileType(String fileType) { this.fileType = fileType; }
  public String getFileUrl() { return fileUrl; }
  public void setFileUrl(String fileUrl) { this.fileUrl = fileUrl; }
}
