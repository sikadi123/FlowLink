package com.flowlink.common;

public record ApiResponse<T>(boolean success, T data, String message, int code) {
  public static <T> ApiResponse<T> ok(T data) {
    return new ApiResponse<>(true, data, "ok", 200);
  }

  public static ApiResponse<Void> fail(String message, int code) {
    return new ApiResponse<>(false, null, message, code);
  }
}
