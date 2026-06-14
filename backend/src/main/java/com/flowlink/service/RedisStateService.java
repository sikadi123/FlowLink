package com.flowlink.service;

import com.flowlink.config.FlowLinkProperties;
import java.time.Duration;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class RedisStateService {
  private static final String SESSION_PREFIX = "flowlink:session:";
  private static final String ONLINE_KEY = "flowlink:online";
  private static final String UNREAD_PREFIX = "flowlink:unread:";
  private final StringRedisTemplate redis;
  private final FlowLinkProperties properties;
  private final ConcurrentMap<String, String> memorySessions = new ConcurrentHashMap<>();
  private final Set<String> memoryOnlineUsers = ConcurrentHashMap.newKeySet();
  private final ConcurrentMap<Long, ConcurrentMap<String, Long>> memoryUnread = new ConcurrentHashMap<>();

  public RedisStateService(StringRedisTemplate redis, FlowLinkProperties properties) {
    this.redis = redis;
    this.properties = properties;
  }

  public void saveSession(String token, Long userId) {
    if (!redisAvailable()) {
      memorySessions.put(token, String.valueOf(userId));
      return;
    }
    redis.opsForValue().set(SESSION_PREFIX + token, String.valueOf(userId), Duration.ofSeconds(properties.getSession().getTtlSeconds()));
  }

  public Long getSessionUser(String token) {
    String value = redisAvailable() ? redis.opsForValue().get(SESSION_PREFIX + token) : memorySessions.get(token);
    return value == null ? null : Long.valueOf(value);
  }

  public void removeSession(String token) {
    if (!redisAvailable()) {
      memorySessions.remove(token);
      return;
    }
    redis.delete(SESSION_PREFIX + token);
  }

  public void markOnline(Long userId) {
    if (!redisAvailable()) {
      memoryOnlineUsers.add(String.valueOf(userId));
      return;
    }
    redis.opsForSet().add(ONLINE_KEY, String.valueOf(userId));
  }

  public void markOffline(Long userId) {
    if (!redisAvailable()) {
      memoryOnlineUsers.remove(String.valueOf(userId));
      return;
    }
    redis.opsForSet().remove(ONLINE_KEY, String.valueOf(userId));
  }

  public boolean isOnline(Long userId) {
    if (!redisAvailable()) return memoryOnlineUsers.contains(String.valueOf(userId));
    return Boolean.TRUE.equals(redis.opsForSet().isMember(ONLINE_KEY, String.valueOf(userId)));
  }

  public Set<String> onlineUsers() {
    if (!redisAvailable()) return memoryOnlineUsers;
    return redis.opsForSet().members(ONLINE_KEY);
  }

  public void increaseUnread(Long userId, String conversationId) {
    if (!redisAvailable()) {
      memoryUnread.computeIfAbsent(userId, ignored -> new ConcurrentHashMap<>()).merge(conversationId, 1L, Long::sum);
      return;
    }
    redis.opsForHash().increment(UNREAD_PREFIX + userId, conversationId, 1);
  }

  public void clearUnread(Long userId, String conversationId) {
    if (!redisAvailable()) {
      Map<String, Long> userUnread = memoryUnread.get(userId);
      if (userUnread != null) userUnread.remove(conversationId);
      return;
    }
    redis.opsForHash().delete(UNREAD_PREFIX + userId, conversationId);
  }

  private boolean redisAvailable() {
    try {
      return Boolean.TRUE.equals(redis.getConnectionFactory().getConnection().ping() != null);
    } catch (Exception ignored) {
      return false;
    }
  }
}
