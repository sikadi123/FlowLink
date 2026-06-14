package com.flowlink.realtime;

import com.flowlink.service.RedisStateService;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.SimpleChannelInboundHandler;
import io.netty.handler.codec.http.DefaultFullHttpResponse;
import io.netty.handler.codec.http.FullHttpRequest;
import io.netty.handler.codec.http.HttpHeaderNames;
import io.netty.handler.codec.http.HttpHeaderValues;
import io.netty.handler.codec.http.HttpResponseStatus;
import io.netty.handler.codec.http.HttpVersion;
import io.netty.handler.codec.http.QueryStringDecoder;
import io.netty.util.ReferenceCountUtil;
import java.util.List;
import org.springframework.stereotype.Component;

public class WebSocketAuthHandler extends SimpleChannelInboundHandler<FullHttpRequest> {
  private final RedisStateService redisStateService;
  private final ChannelRegistry registry;

  public WebSocketAuthHandler(RedisStateService redisStateService, ChannelRegistry registry) {
    this.redisStateService = redisStateService;
    this.registry = registry;
  }

  @Override
  protected void channelRead0(ChannelHandlerContext ctx, FullHttpRequest request) {
    QueryStringDecoder decoder = new QueryStringDecoder(request.uri());
    List<String> tokens = decoder.parameters().get("token");
    String token = tokens == null || tokens.isEmpty() ? "" : tokens.get(0);
    Long userId = redisStateService.getSessionUser(token);
    if (userId == null) {
      DefaultFullHttpResponse response = new DefaultFullHttpResponse(HttpVersion.HTTP_1_1, HttpResponseStatus.UNAUTHORIZED);
      response.headers().set(HttpHeaderNames.CONNECTION, HttpHeaderValues.CLOSE);
      ctx.writeAndFlush(response);
      ctx.close();
      return;
    }
    registry.add(userId, ctx.channel());
    redisStateService.markOnline(userId);
    ctx.fireChannelRead(ReferenceCountUtil.retain(request));
  }

  @Override
  public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) {
    ctx.close();
  }

  @Component
  public static class Factory {
    private final RedisStateService redisStateService;
    private final ChannelRegistry registry;

    public Factory(RedisStateService redisStateService, ChannelRegistry registry) {
      this.redisStateService = redisStateService;
      this.registry = registry;
    }

    public WebSocketAuthHandler create() {
      return new WebSocketAuthHandler(redisStateService, registry);
    }
  }
}
