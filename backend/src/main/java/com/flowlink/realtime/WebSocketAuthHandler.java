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
  private final String path;

  public WebSocketAuthHandler(RedisStateService redisStateService, ChannelRegistry registry, String path) {
    this.redisStateService = redisStateService;
    this.registry = registry;
    this.path = path;
  }

  @Override
  protected void channelRead0(ChannelHandlerContext ctx, FullHttpRequest request) {
    QueryStringDecoder decoder = new QueryStringDecoder(request.uri());
    if (!path.equals(decoder.path())) {
      DefaultFullHttpResponse response = new DefaultFullHttpResponse(HttpVersion.HTTP_1_1, HttpResponseStatus.NOT_FOUND);
      response.headers().set(HttpHeaderNames.CONNECTION, HttpHeaderValues.CLOSE);
      ctx.writeAndFlush(response);
      ctx.close();
      return;
    }
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
    request.setUri(path);
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
    private final com.flowlink.config.FlowLinkProperties properties;

    public Factory(RedisStateService redisStateService, ChannelRegistry registry, com.flowlink.config.FlowLinkProperties properties) {
      this.redisStateService = redisStateService;
      this.registry = registry;
      this.properties = properties;
    }

    public WebSocketAuthHandler create() {
      return new WebSocketAuthHandler(redisStateService, registry, properties.getNetty().getPath());
    }
  }
}
