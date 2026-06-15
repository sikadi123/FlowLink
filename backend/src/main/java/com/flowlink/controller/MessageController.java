package com.flowlink.controller;

import com.flowlink.common.ApiResponse;
import com.flowlink.domain.Message;
import com.flowlink.domain.User;
import com.flowlink.realtime.ChannelRegistry;
import com.flowlink.service.AuthService;
import com.flowlink.service.MessageService;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/messages")
public class MessageController {
  private final AuthService authService;
  private final MessageService messageService;
  private final ChannelRegistry registry;

  public MessageController(AuthService authService, MessageService messageService, ChannelRegistry registry) {
    this.authService = authService;
    this.messageService = messageService;
    this.registry = registry;
  }

  @GetMapping("/history")
  public ApiResponse<List<Message>> history(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @RequestParam("type") String type,
      @RequestParam("targetId") Long targetId,
      @RequestParam(value = "beforeId", required = false) Long beforeId,
      @RequestParam(value = "limit", required = false) Integer limit
  ) {
    User user = authService.requireUser(authorization);
    return ApiResponse.ok(messageService.history(user.getId(), type, targetId, beforeId, limit));
  }

  @PostMapping("/send")
  public ApiResponse<Message> send(@RequestHeader(value = "Authorization", required = false) String authorization, @RequestBody Map<String, Object> body) {
    User user = authService.requireUser(authorization);
    String type = String.valueOf(body.getOrDefault("conversationType", "private"));
    Long targetId = Long.valueOf(String.valueOf(body.getOrDefault("targetId", "0")));
    String content = String.valueOf(body.getOrDefault("content", ""));
    Integer messageType = messageTypeOf(String.valueOf(body.getOrDefault("messageType", "1")));
    String clientId = String.valueOf(body.getOrDefault("clientId", ""));
    Long fileRecordId = body.containsKey("fileRecordId") ? Long.valueOf(String.valueOf(body.get("fileRecordId"))) : null;
    return ApiResponse.ok(messageService.create(user.getId(), type, targetId, content, messageType, clientId, fileRecordId, registry));
  }

  @PostMapping("/{id}/recall")
  public ApiResponse<Message> recall(@RequestHeader(value = "Authorization", required = false) String authorization, @PathVariable("id") Long id) {
    User user = authService.requireUser(authorization);
    return ApiResponse.ok(messageService.recall(user.getId(), id, registry));
  }

  @DeleteMapping("/{id}")
  public ApiResponse<Message> delete(@RequestHeader(value = "Authorization", required = false) String authorization, @PathVariable("id") Long id) {
    User user = authService.requireUser(authorization);
    return ApiResponse.ok(messageService.delete(user.getId(), id, registry));
  }

  private Integer messageTypeOf(String value) {
    return switch (value) {
      case "image", "2" -> 2;
      case "file", "3" -> 3;
      case "voice", "4" -> 4;
      default -> 1;
    };
  }
}
