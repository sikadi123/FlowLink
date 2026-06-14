package com.flowlink.controller;

import com.flowlink.common.ApiResponse;
import com.flowlink.domain.User;
import com.flowlink.service.AuthService;
import com.flowlink.service.FileStorageService;
import java.util.Map;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/files")
public class FileController {
  private final AuthService authService;
  private final FileStorageService fileStorageService;

  public FileController(AuthService authService, FileStorageService fileStorageService) {
    this.authService = authService;
    this.fileStorageService = fileStorageService;
  }

  @PostMapping("/upload")
  public ApiResponse<Map<String, Object>> upload(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @RequestPart("file") MultipartFile file
  ) throws Exception {
    User user = authService.requireUser(authorization);
    return ApiResponse.ok(fileStorageService.upload(user.getId(), file));
  }
}
