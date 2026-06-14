package com.flowlink.realtime;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.netty.channel.Channel;
import io.netty.handler.codec.http.websocketx.TextWebSocketFrame;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

@Component
public class ChannelRegistry {
  private final ObjectMapper objectMapper;
  private final Map<Long, Set<Channel>> channels = new ConcurrentHashMap<>();

  public ChannelRegistry(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  public void add(Long userId, Channel channel) {
    channels.computeIfAbsent(userId, ignored -> ConcurrentHashMap.newKeySet()).add(channel);
    channel.attr(NettyAttrs.USER_ID).set(userId);
  }

  public void remove(Channel channel) {
    Long userId = channel.attr(NettyAttrs.USER_ID).get();
    if (userId == null) return;
    Set<Channel> userChannels = channels.get(userId);
    if (userChannels == null) return;
    userChannels.remove(channel);
    if (userChannels.isEmpty()) channels.remove(userId);
  }

  public boolean isOnline(Long userId) {
    Set<Channel> userChannels = channels.get(userId);
    return userChannels != null && !userChannels.isEmpty();
  }

  public void send(Long userId, String action, Object payload) {
    Set<Channel> userChannels = channels.get(userId);
    if (userChannels == null) return;
    String text = encode(action, payload);
    for (Channel channel : userChannels) {
      if (channel.isActive()) channel.writeAndFlush(new TextWebSocketFrame(text));
    }
  }

  public void sendToMany(Iterable<Long> userIds, String action, Object payload) {
    for (Long userId : userIds) send(userId, action, payload);
  }

  public void send(Channel channel, String action, Object payload) {
    channel.writeAndFlush(new TextWebSocketFrame(encode(action, payload)));
  }

  private String encode(String action, Object payload) {
    try {
      return objectMapper.writeValueAsString(Map.of("action", action, "payload", payload == null ? Map.of() : payload));
    } catch (Exception error) {
      throw new IllegalStateException(error);
    }
  }
}
