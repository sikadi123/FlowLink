package com.flowlink.controller;

import com.flowlink.common.ApiResponse;
import com.flowlink.config.FlowLinkProperties;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class RealtimeController {
  private final FlowLinkProperties properties;

  public RealtimeController(FlowLinkProperties properties) {
    this.properties = properties;
  }

  @GetMapping("/api/realtime/status")
  public ApiResponse<Map<String, Object>> status() {
    return ApiResponse.ok(Map.of(
        "enabled", true,
        "port", properties.getNetty().getPort(),
        "path", properties.getNetty().getPath()
    ));
  }
}
