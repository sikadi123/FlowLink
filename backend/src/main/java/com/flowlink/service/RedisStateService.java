package com.flowlink.service;

import com.flowlink.config.FlowLinkProperties;
import java.time.Duration;
import java.util.Set;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class RedisStateService {
  private static final String SESSION_PREFIX = "flowlink:session:";
  private static final String ONLINE_KEY = "flowlink:online";
  private static final String UNREAD_PREFIX = "flowlink:unread:";
  private final StringRedisTemplate redis;
  private final FlowLinkProperties properties;

  public RedisStateService(StringRedisTemplate redis, FlowLinkProperties properties) {
    this.redis = redis;
    this.properties = properties;
  }

  public void saveSession(String token, Long userId) {
    redis.opsForValue().set(SESSION_PREFIX + token, String.valueOf(userId), Duration.ofSeconds(properties.getSession().getTtlSeconds()));
  }

  public Long getSessionUser(String token) {
    String value = redis.opsForValue().get(SESSION_PREFIX + token);
    return value == null ? null : Long.valueOf(value);
  }

  public void removeSession(String token) {
    redis.delete(SESSION_PREFIX + token);
  }

  public void markOnline(Long userId) {
    redis.opsForSet().add(ONLINE_KEY, String.valueOf(userId));
  }

  public void markOffline(Long userId) {
    redis.opsForSet().remove(ONLINE_KEY, String.valueOf(userId));
  }

  public boolean isOnline(Long userId) {
    return Boolean.TRUE.equals(redis.opsForSet().isMember(ONLINE_KEY, String.valueOf(userId)));
  }

  public Set<String> onlineUsers() {
    return redis.opsForSet().members(ONLINE_KEY);
  }

  public void increaseUnread(Long userId, String conversationId) {
    redis.opsForHash().increment(UNREAD_PREFIX + userId, conversationId, 1);
  }

  public void clearUnread(Long userId, String conversationId) {
    redis.opsForHash().delete(UNREAD_PREFIX + userId, conversationId);
  }
}
