package com.flowlink.service;

import com.flowlink.common.BusinessException;
import com.flowlink.domain.ChatGroup;
import com.flowlink.domain.FileRecord;
import com.flowlink.domain.GroupMember;
import com.flowlink.domain.Message;
import com.flowlink.mapper.FileRecordMapper;
import com.flowlink.mapper.FriendshipMapper;
import com.flowlink.mapper.GroupMemberMapper;
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
  private final FriendshipMapper friendshipMapper;
  private final RedisStateService redisStateService;

  public MessageService(MessageMapper messageMapper, GroupService groupService, GroupMemberMapper memberMapper, FileRecordMapper fileRecordMapper, FriendshipMapper friendshipMapper, RedisStateService redisStateService) {
    this.messageMapper = messageMapper;
    this.groupService = groupService;
    this.memberMapper = memberMapper;
    this.fileRecordMapper = fileRecordMapper;
    this.friendshipMapper = friendshipMapper;
    this.redisStateService = redisStateService;
  }

  public List<Message> history(Long userId, String type, Long targetId) {
    return history(userId, type, targetId, null, 200);
  }

  public List<Message> history(Long userId, String type, Long targetId, Long beforeId, Integer limit) {
    int safeLimit = Math.max(20, Math.min(limit == null ? 200 : limit, 200));
    if ("group".equals(type)) {
      groupService.requireMember(targetId, userId);
      if (beforeId == null) redisStateService.clearUnread(userId, "group:" + targetId);
      return messageMapper.groupHistory(targetId, beforeId, safeLimit);
    }
    if (beforeId == null) redisStateService.clearUnread(userId, "private:" + targetId);
    return messageMapper.privateHistory(userId, targetId, beforeId, safeLimit);
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
      assertCanPrivateMessage(senderId, targetId);
      message.setConversationType(1);
      message.setReceiverId(targetId);
    }
    messageMapper.insert(message);
    if (fileRecordId != null) {
      FileRecord fileRecord = fileRecordMapper.findById(fileRecordId);
      if (fileRecord == null) throw new BusinessException(404, "文件不存在");
      fileRecord.setMessageId(message.getId());
      fileRecordMapper.bindMessage(fileRecord);
      message.setFileRecordId(fileRecord.getId());
      message.setFileName(fileRecord.getFileName());
      message.setFileSize(fileRecord.getFileSize());
      message.setFileType(fileRecord.getFileType());
      message.setFileUrl(fileRecord.getAccessUrl());
    }
    pushNewMessage(senderId, type, targetId, message, registry);
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

  public Message recall(Long userId, Long messageId, ChannelRegistry registry) {
    Message message = messageMapper.findById(messageId);
    if (message == null || !userId.equals(message.getSenderId())) throw new BusinessException(404, "消息不存在");
    if (Boolean.TRUE.equals(message.getRecalled())) return message;
    messageMapper.recall(messageId);
    message.setRecalled(true);
    pushMessageEvent("message_recalled", message, registry);
    return message;
  }

  @Transactional
  public Message delete(Long userId, Long messageId, ChannelRegistry registry) {
    Message message = messageMapper.findById(messageId);
    if (message == null) throw new BusinessException(404, "消息不存在");
    assertCanDelete(userId, message);
    messageMapper.unbindFiles(messageId);
    messageMapper.deleteReceipts(messageId);
    messageMapper.deleteById(messageId);
    pushMessageEvent("message_deleted", message, registry);
    return message;
  }

  private void pushNewMessage(Long senderId, String type, Long targetId, Message message, ChannelRegistry registry) {
    if (registry == null) return;
    if ("group".equals(type)) {
      for (GroupMember member : memberMapper.findActiveMembers(targetId)) {
        if (!member.getUserId().equals(senderId)) redisStateService.increaseUnread(member.getUserId(), "group:" + targetId);
        registry.send(member.getUserId(), "new_message", Map.of("message", message));
      }
    } else {
      redisStateService.increaseUnread(targetId, "private:" + senderId);
      registry.send(targetId, "new_message", Map.of("message", message));
      registry.send(senderId, "new_message", Map.of("message", message));
    }
  }

  private void pushMessageEvent(String action, Message message, ChannelRegistry registry) {
    if (registry == null) return;
    Map<String, Object> payload = Map.of(
        "messageId", message.getId(),
        "conversationType", message.getConversationType(),
        "senderId", message.getSenderId(),
        "receiverId", message.getReceiverId() == null ? "" : message.getReceiverId(),
        "groupId", message.getGroupId() == null ? "" : message.getGroupId()
    );
    if (Integer.valueOf(2).equals(message.getConversationType())) {
      for (GroupMember member : memberMapper.findActiveMembers(message.getGroupId())) {
        registry.send(member.getUserId(), action, payload);
      }
    } else {
      registry.send(message.getSenderId(), action, payload);
      if (message.getReceiverId() != null) registry.send(message.getReceiverId(), action, payload);
    }
  }

  private void assertCanSpeak(Long userId, Long groupId) {
    ChatGroup group = groupService.requireGroup(groupId);
    GroupMember member = groupService.requireMember(groupId, userId);
    if (Boolean.TRUE.equals(member.getMuted())) throw new BusinessException(403, "你已被管理员禁言");
    if (member.getRole() == GroupService.ROLE_OWNER || member.getRole() == GroupService.ROLE_ADMIN) return;
    if (Boolean.TRUE.equals(group.getMuteAll())) throw new BusinessException(403, "当前群聊已开启全员禁言");
  }

  private void assertCanPrivateMessage(Long senderId, Long receiverId) {
    if (friendshipMapper.countBlocked(receiverId, senderId) > 0) throw new BusinessException(403, "对方已拒收你的消息");
  }

  private void assertCanDelete(Long userId, Message message) {
    if (Integer.valueOf(2).equals(message.getConversationType())) {
      groupService.requireMember(message.getGroupId(), userId);
      return;
    }
    if (userId.equals(message.getSenderId()) || userId.equals(message.getReceiverId())) return;
    throw new BusinessException(403, "不能删除不属于你的消息");
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
