package com.flowlink.service;

import com.flowlink.config.FlowLinkProperties;
import com.flowlink.domain.FileRecord;
import com.flowlink.mapper.FileRecordMapper;
import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class FileStorageService {
  private final MinioClient minioClient;
  private final FlowLinkProperties properties;
  private final FileRecordMapper fileRecordMapper;

  public FileStorageService(MinioClient minioClient, FlowLinkProperties properties, FileRecordMapper fileRecordMapper) {
    this.minioClient = minioClient;
    this.properties = properties;
    this.fileRecordMapper = fileRecordMapper;
  }

  public Map<String, Object> upload(Long uploaderId, MultipartFile file) throws Exception {
    if ("local".equalsIgnoreCase(properties.getStorage().getMode())) {
      return uploadToLocal(uploaderId, file);
    }
    ensureBucket();
    String originalName = safeName(file.getOriginalFilename());
    String objectName = "messages/" + uploaderId + "/" + UUID.randomUUID() + "-" + originalName;
    String contentType = file.getContentType() == null ? "application/octet-stream" : file.getContentType();
    minioClient.putObject(PutObjectArgs.builder()
        .bucket(properties.getMinio().getBucket())
        .object(objectName)
        .contentType(contentType)
        .stream(file.getInputStream(), file.getSize(), -1)
        .build());
    String accessUrl = properties.getMinio().getPublicBaseUrl() + "/" + objectName;
    FileRecord record = new FileRecord();
    record.setUploaderId(uploaderId);
    record.setFileName(originalName);
    record.setStoragePath(objectName);
    record.setAccessUrl(accessUrl);
    record.setFileSize(file.getSize());
    record.setFileType(contentType);
    fileRecordMapper.insert(record);
    return Map.of(
        "fileRecordId", record.getId(),
        "fileName", originalName,
        "fileSize", file.getSize(),
        "fileType", contentType,
        "url", accessUrl,
        "storagePath", objectName
    );
  }

  private Map<String, Object> uploadToLocal(Long uploaderId, MultipartFile file) throws Exception {
    String originalName = safeName(file.getOriginalFilename());
    String relativeName = "messages/" + uploaderId + "/" + UUID.randomUUID() + "-" + originalName;
    Path root = Paths.get(properties.getStorage().getLocalDir()).toAbsolutePath().normalize();
    Path target = root.resolve(relativeName).normalize();
    if (!target.startsWith(root)) throw new IllegalArgumentException("非法文件路径");
    Files.createDirectories(target.getParent());
    file.transferTo(target);

    String contentType = file.getContentType() == null ? "application/octet-stream" : file.getContentType();
    String accessUrl = properties.getStorage().getPublicPath() + "/" + relativeName.replace("\\", "/");
    FileRecord record = new FileRecord();
    record.setUploaderId(uploaderId);
    record.setFileName(originalName);
    record.setStoragePath(target.toString());
    record.setAccessUrl(accessUrl);
    record.setFileSize(file.getSize());
    record.setFileType(contentType);
    fileRecordMapper.insert(record);
    return Map.of(
        "fileRecordId", record.getId(),
        "fileName", originalName,
        "fileSize", file.getSize(),
        "fileType", contentType,
        "url", accessUrl,
        "storagePath", record.getStoragePath()
    );
  }

  private void ensureBucket() throws Exception {
    String bucket = properties.getMinio().getBucket();
    boolean exists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucket).build());
    if (!exists) minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
  }

  private String safeName(String filename) {
    String value = filename == null || filename.isBlank() ? "file" : filename;
    return Paths.get(value).getFileName().toString().replaceAll("[\\\\/:*?\"<>|]", "_");
  }
}
