package com.flowlink.service;

import com.flowlink.domain.Notification;
import com.flowlink.mapper.NotificationMapper;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class NotificationService {
  private final NotificationMapper notificationMapper;

  public NotificationService(NotificationMapper notificationMapper) {
    this.notificationMapper = notificationMapper;
  }

  public List<Notification> list(Long receiverId) {
    return notificationMapper.findByReceiver(receiverId);
  }

  public void create(Long receiverId, String type, String content) {
    Notification notification = new Notification();
    notification.setReceiverId(receiverId);
    notification.setType(type);
    notification.setContent(content);
    notification.setRead(false);
    notificationMapper.insert(notification);
  }

  public void markAllRead(Long receiverId) {
    notificationMapper.markAllRead(receiverId);
  }

  public void deleteOne(Long receiverId, Long notificationId) {
    notificationMapper.deleteOne(receiverId, notificationId);
  }

  public void deleteAll(Long receiverId) {
    notificationMapper.deleteAll(receiverId);
  }
}
