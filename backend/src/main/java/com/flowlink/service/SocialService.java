package com.flowlink.service;

import com.flowlink.common.BusinessException;
import com.flowlink.domain.FriendRequest;
import com.flowlink.domain.User;
import com.flowlink.mapper.FriendRequestMapper;
import com.flowlink.mapper.FriendshipMapper;
import com.flowlink.mapper.UserMapper;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SocialService {
  private static final int REQUEST_PENDING = 0;
  private static final int REQUEST_ACCEPTED = 1;
  private static final int REQUEST_REJECTED = 2;
  private final UserMapper userMapper;
  private final FriendshipMapper friendshipMapper;
  private final FriendRequestMapper requestMapper;
  private final NotificationService notificationService;

  public SocialService(UserMapper userMapper, FriendshipMapper friendshipMapper, FriendRequestMapper requestMapper, NotificationService notificationService) {
    this.userMapper = userMapper;
    this.friendshipMapper = friendshipMapper;
    this.requestMapper = requestMapper;
    this.notificationService = notificationService;
  }

  public List<Map<String, Object>> searchUsers(User current, String keyword) {
    return userMapper.search(keyword == null ? "" : keyword.trim()).stream()
        .filter(user -> !user.getId().equals(current.getId()))
        .map(user -> {
          Map<String, Object> payload = AuthService.publicUser(user);
          payload.put("isFriend", friendshipMapper.countFriendship(current.getId(), user.getId()) > 0);
          payload.put("requestPending", requestMapper.countPending(current.getId(), user.getId()) > 0 || requestMapper.countPending(user.getId(), current.getId()) > 0);
          return payload;
        })
        .toList();
  }

  public List<FriendRequest> myRequests(Long userId) {
    return requestMapper.findByUser(userId);
  }

  @Transactional
  public FriendRequest sendRequest(User current, Long receiverId, String message) {
    if (current.getId().equals(receiverId)) throw new BusinessException(400, "不能添加自己为好友");
    User receiver = userMapper.findById(receiverId);
    if (receiver == null) throw new BusinessException(404, "用户不存在");
    if (friendshipMapper.countFriendship(current.getId(), receiverId) > 0) throw new BusinessException(409, "已经是好友");
    if (requestMapper.countPending(current.getId(), receiverId) > 0) throw new BusinessException(409, "好友申请已发送");
    FriendRequest request = new FriendRequest();
    request.setSenderId(current.getId());
    request.setReceiverId(receiverId);
    request.setMessage(message == null || message.isBlank() ? "希望添加你为好友" : message.trim());
    requestMapper.insert(request);
    notificationService.create(receiverId, "friend_request", current.getDisplayName() + " 请求添加你为好友");
    return request;
  }

  @Transactional
  public void respond(User current, Long requestId, String action) {
    FriendRequest request = requestMapper.findById(requestId);
    if (request == null || !request.getReceiverId().equals(current.getId())) throw new BusinessException(404, "好友申请不存在");
    if (request.getStatus() != REQUEST_PENDING) throw new BusinessException(409, "该申请已处理");
    boolean accept = "accept".equalsIgnoreCase(action) || "accepted".equalsIgnoreCase(action);
    requestMapper.updateStatus(requestId, accept ? REQUEST_ACCEPTED : REQUEST_REJECTED);
    User sender = userMapper.findById(request.getSenderId());
    if (accept) {
      saveFriendship(current.getId(), request.getSenderId());
      saveFriendship(request.getSenderId(), current.getId());
      notificationService.create(request.getSenderId(), "friend_accepted", current.getDisplayName() + " 已通过你的好友申请");
    } else {
      notificationService.create(request.getSenderId(), "friend_rejected", current.getDisplayName() + " 已拒绝你的好友申请");
    }
    if (sender == null) throw new BusinessException(404, "申请发送者不存在");
  }

  @Transactional
  public void deleteFriend(User current, Long friendId) {
    friendshipMapper.delete(current.getId(), friendId);
    friendshipMapper.delete(friendId, current.getId());
  }

  @Transactional
  public void blockFriend(User current, Long friendId) {
    if (current.getId().equals(friendId)) throw new BusinessException(400, "不能拉黑自己");
    User target = userMapper.findById(friendId);
    if (target == null) throw new BusinessException(404, "用户不存在");
    if (friendshipMapper.countAny(current.getId(), friendId) > 0) {
      friendshipMapper.block(current.getId(), friendId);
    } else {
      friendshipMapper.insert(current.getId(), friendId);
      friendshipMapper.block(current.getId(), friendId);
    }
    friendshipMapper.delete(friendId, current.getId());
  }

  @Transactional
  public void unblockFriend(User current, Long friendId) {
    friendshipMapper.delete(current.getId(), friendId);
  }

  private void saveFriendship(Long userId, Long friendId) {
    if (friendshipMapper.countAny(userId, friendId) > 0) {
      friendshipMapper.restore(userId, friendId);
    } else {
      friendshipMapper.insert(userId, friendId);
    }
  }
}
