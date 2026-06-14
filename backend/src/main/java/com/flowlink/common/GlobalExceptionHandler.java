package com.flowlink.common;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {
  @ExceptionHandler(BusinessException.class)
  public ResponseEntity<ApiResponse<Void>> business(BusinessException error) {
    return ResponseEntity.status(error.getStatus()).body(ApiResponse.fail(error.getMessage(), error.getStatus()));
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiResponse<Void>> fallback(Exception error) {
    return ResponseEntity.status(500).body(ApiResponse.fail(error.getMessage(), 500));
  }
}
