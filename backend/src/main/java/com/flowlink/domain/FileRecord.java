package com.flowlink.domain;

import java.time.LocalDateTime;

public class FileRecord {
  private Long id;
  private Long uploaderId;
  private Long messageId;
  private String fileName;
  private String storagePath;
  private String accessUrl;
  private Long fileSize;
  private String fileType;
  private LocalDateTime uploadTime;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public Long getUploaderId() { return uploaderId; }
  public void setUploaderId(Long uploaderId) { this.uploaderId = uploaderId; }
  public Long getMessageId() { return messageId; }
  public void setMessageId(Long messageId) { this.messageId = messageId; }
  public String getFileName() { return fileName; }
  public void setFileName(String fileName) { this.fileName = fileName; }
  public String getStoragePath() { return storagePath; }
  public void setStoragePath(String storagePath) { this.storagePath = storagePath; }
  public String getAccessUrl() { return accessUrl; }
  public void setAccessUrl(String accessUrl) { this.accessUrl = accessUrl; }
  public Long getFileSize() { return fileSize; }
  public void setFileSize(Long fileSize) { this.fileSize = fileSize; }
  public String getFileType() { return fileType; }
  public void setFileType(String fileType) { this.fileType = fileType; }
  public LocalDateTime getUploadTime() { return uploadTime; }
  public void setUploadTime(LocalDateTime uploadTime) { this.uploadTime = uploadTime; }
}
