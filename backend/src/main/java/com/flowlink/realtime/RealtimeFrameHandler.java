package com.flowlink.realtime;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowlink.service.MessageService;
import com.flowlink.service.RedisStateService;
import io.netty.channel.ChannelHandler;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.SimpleChannelInboundHandler;
import io.netty.handler.codec.http.websocketx.TextWebSocketFrame;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
@ChannelHandler.Sharable
public class RealtimeFrameHandler extends SimpleChannelInboundHandler<TextWebSocketFrame> {
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
    if ("read_conversation".equals(packet.action())) {
      String conversationId = String.valueOf(payload.getOrDefault("conversationId", ""));
      redisStateService.clearUnread(userId, conversationId);
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
