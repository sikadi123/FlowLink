package com.flowlink.service;

import com.flowlink.config.FlowLinkProperties;
import com.flowlink.domain.FileRecord;
import com.flowlink.mapper.FileRecordMapper;
import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
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
    ensureBucket();
    String originalName = file.getOriginalFilename() == null ? "file" : file.getOriginalFilename();
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

  private void ensureBucket() throws Exception {
    String bucket = properties.getMinio().getBucket();
    boolean exists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucket).build());
    if (!exists) minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
  }
}
