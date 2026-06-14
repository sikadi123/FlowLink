package com.flowlink.service;

import com.flowlink.common.BusinessException;
import com.flowlink.domain.ChatGroup;
import com.flowlink.domain.GroupMember;
import com.flowlink.domain.Message;
import com.flowlink.mapper.GroupMemberMapper;
import com.flowlink.mapper.FileRecordMapper;
import com.flowlink.mapper.MessageMapper;
import com.flowlink.realtime.ChannelRegistry;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MessageService {
  private final MessageMapper messageMapper;
  private final GroupService groupService;
  private final GroupMemberMapper memberMapper;
  private final FileRecordMapper fileRecordMapper;
  private final RedisStateService redisStateService;

  public MessageService(MessageMapper messageMapper, GroupService groupService, GroupMemberMapper memberMapper, FileRecordMapper fileRecordMapper, RedisStateService redisStateService) {
    this.messageMapper = messageMapper;
    this.groupService = groupService;
    this.memberMapper = memberMapper;
    this.fileRecordMapper = fileRecordMapper;
    this.redisStateService = redisStateService;
  }

  public List<Message> history(Long userId, String type, Long targetId) {
    if ("group".equals(type)) {
      groupService.requireMember(targetId, userId);
      redisStateService.clearUnread(userId, "group:" + targetId);
      return messageMapper.groupHistory(targetId, 200);
    }
    redisStateService.clearUnread(userId, "private:" + targetId);
    return messageMapper.privateHistory(userId, targetId, 200);
  }

  @Transactional
  public Message create(Long senderId, String type, Long targetId, String content, Integer messageType, String clientId, Long fileRecordId, ChannelRegistry registry) {
    if (content == null || content.isBlank()) throw new BusinessException(400, "消息内容不能为空");
    Message message = new Message();
    message.setSenderId(senderId);
    message.setContent(content.trim());
    message.setMessageType(messageType == null ? 1 : messageType);
    message.setClientId(clientId);
    if ("group".equals(type)) {
      assertCanSpeak(senderId, targetId);
      message.setConversationType(2);
      message.setGroupId(targetId);
    } else {
      message.setConversationType(1);
      message.setReceiverId(targetId);
    }
    messageMapper.insert(message);
    if (fileRecordId != null) {
      com.flowlink.domain.FileRecord fileRecord = new com.flowlink.domain.FileRecord();
      fileRecord.setId(fileRecordId);
      fileRecord.setMessageId(message.getId());
      fileRecordMapper.bindMessage(fileRecord);
    }
    if (registry != null) {
      if ("group".equals(type)) {
        for (GroupMember member : memberMapper.findActiveMembers(targetId)) {
          if (!member.getUserId().equals(senderId)) {
            redisStateService.increaseUnread(member.getUserId(), "group:" + targetId);
            registry.send(member.getUserId(), "new_message", Map.of("message", message));
          }
        }
      } else {
        redisStateService.increaseUnread(targetId, "private:" + senderId);
        registry.send(targetId, "new_message", Map.of("message", message));
      }
    }
    return message;
  }

  public Map<String, Object> createFromRealtime(Long senderId, Map<String, Object> payload, ChannelRegistry registry) {
    String type = String.valueOf(payload.getOrDefault("conversationType", "private"));
    Long targetId = Long.valueOf(String.valueOf(payload.getOrDefault("targetId", "0")));
    String content = String.valueOf(payload.getOrDefault("content", ""));
    String clientId = String.valueOf(payload.getOrDefault("clientId", ""));
    int messageType = messageTypeOf(String.valueOf(payload.getOrDefault("messageType", "text")));
    Long fileRecordId = payload.containsKey("fileRecordId") ? Long.valueOf(String.valueOf(payload.get("fileRecordId"))) : null;
    Message message = create(senderId, type, targetId, content, messageType, clientId, fileRecordId, registry);
    return Map.of("clientId", clientId, "messageId", message.getId(), "status", "sent");
  }

  public void recall(Long userId, Long messageId) {
    Message message = messageMapper.findById(messageId);
    if (message == null || !userId.equals(message.getSenderId())) throw new BusinessException(404, "消息不存在");
    messageMapper.recall(messageId);
  }

  private void assertCanSpeak(Long userId, Long groupId) {
    ChatGroup group = groupService.requireGroup(groupId);
    GroupMember member = groupService.requireMember(groupId, userId);
    if (Boolean.TRUE.equals(member.getMuted())) throw new BusinessException(403, "你已被管理员禁言");
    if (member.getRole() == GroupService.ROLE_OWNER || member.getRole() == GroupService.ROLE_ADMIN) return;
    if (Boolean.TRUE.equals(group.getMuteAll())) throw new BusinessException(403, "当前群聊已开启全员禁言");
  }

  private int messageTypeOf(String value) {
    return switch (value) {
      case "image", "2" -> 2;
      case "file", "3" -> 3;
      case "voice" -> 4;
      default -> 1;
    };
  }
}
