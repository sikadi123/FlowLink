package com.flowlink.config;

import io.minio.MinioClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MinioConfig {
  @Bean
  public MinioClient minioClient(FlowLinkProperties properties) {
    return MinioClient.builder()
        .endpoint(properties.getMinio().getEndpoint())
        .credentials(properties.getMinio().getAccessKey(), properties.getMinio().getSecretKey())
        .build();
  }
}
