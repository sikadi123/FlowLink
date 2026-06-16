package com.flowlink.realtime;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowlink.service.MessageService;
import com.flowlink.service.RedisStateService;
import io.netty.channel.ChannelHandler;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.SimpleChannelInboundHandler;
import io.netty.handler.codec.http.websocketx.TextWebSocketFrame;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
@ChannelHandler.Sharable
public class RealtimeFrameHandler extends SimpleChannelInboundHandler<TextWebSocketFrame> {
  private static final Set<String> CALL_ACTIONS = Set.of(
      "call_invite",
      "call_accept",
      "call_reject",
      "call_cancel",
      "call_offer",
      "call_answer",
      "call_ice",
      "call_hangup"
  );

  private final ObjectMapper objectMapper;
  private final ChannelRegistry registry;
  private final MessageService messageService;
  private final RedisStateService redisStateService;

  public RealtimeFrameHandler(ObjectMapper objectMapper, ChannelRegistry registry, MessageService messageService, RedisStateService redisStateService) {
    this.objectMapper = objectMapper;
    this.registry = registry;
    this.messageService = messageService;
    this.redisStateService = redisStateService;
  }

  @Override
  protected void channelRead0(ChannelHandlerContext ctx, TextWebSocketFrame frame) throws Exception {
    Long userId = ctx.channel().attr(NettyAttrs.USER_ID).get();
    RealtimePacket packet = objectMapper.readValue(frame.text(), RealtimePacket.class);
    Map<String, Object> payload = packet.payload() == null ? Map.of() : packet.payload();
    if ("heartbeat".equals(packet.action())) {
      registry.send(ctx.channel(), "heartbeat_ack", Map.of("at", System.currentTimeMillis()));
      return;
    }
    if ("send_message".equals(packet.action())) {
      try {
        Object result = messageService.createFromRealtime(userId, payload, registry);
        registry.send(ctx.channel(), "message_ack", result);
      } catch (Exception error) {
        registry.send(ctx.channel(), "message_failed", Map.of(
            "clientId", String.valueOf(payload.getOrDefault("clientId", "")),
            "message", error.getMessage() == null ? "消息发送失败" : error.getMessage()
        ));
      }
      return;
    }
    if (CALL_ACTIONS.contains(packet.action())) {
      forwardCallSignal(ctx, userId, packet.action(), payload);
      return;
    }
    if ("read_conversation".equals(packet.action())) {
      String conversationId = String.valueOf(payload.getOrDefault("conversationId", ""));
      redisStateService.clearUnread(userId, conversationId);
    }
  }

  private void forwardCallSignal(ChannelHandlerContext ctx, Long userId, String action, Map<String, Object> payload) {
    Long targetId = readLong(payload.get("targetId"));
    if (targetId == null || userId == null) {
      registry.send(ctx.channel(), "call_error", Map.of("message", "视频通话参数不完整"));
      return;
    }
    Map<String, Object> forwarded = new LinkedHashMap<>(payload);
    forwarded.put("fromUserId", userId);
    forwarded.put("online", registry.isOnline(userId));
    if (!registry.isOnline(targetId)) {
      registry.send(ctx.channel(), "call_unavailable", Map.of(
          "callId", String.valueOf(payload.getOrDefault("callId", "")),
          "targetId", targetId,
          "message", "对方当前不在线，无法接通视频通话"
      ));
      return;
    }
    registry.send(targetId, action, forwarded);
    if ("call_invite".equals(action)) {
      registry.send(ctx.channel(), "call_ringing", Map.of(
          "callId", String.valueOf(payload.getOrDefault("callId", "")),
          "targetId", targetId
      ));
    }
  }

  private Long readLong(Object value) {
    if (value == null) return null;
    if (value instanceof Number number) return number.longValue();
    try {
      return Long.valueOf(String.valueOf(value));
    } catch (NumberFormatException error) {
      return null;
    }
  }

  @Override
  public void channelInactive(ChannelHandlerContext ctx) {
    Long userId = ctx.channel().attr(NettyAttrs.USER_ID).get();
    registry.remove(ctx.channel());
    if (userId != null && !registry.isOnline(userId)) redisStateService.markOffline(userId);
  }

  @Override
  public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) {
    registry.send(ctx.channel(), "error", Map.of("message", cause.getMessage() == null ? "实时连接异常" : cause.getMessage()));
    ctx.close();
  }
}
