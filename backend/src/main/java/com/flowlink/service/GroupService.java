package com.flowlink.service;

import com.flowlink.common.BusinessException;
import com.flowlink.domain.ChatGroup;
import com.flowlink.domain.GroupMember;
import com.flowlink.domain.User;
import com.flowlink.mapper.GroupMapper;
import com.flowlink.mapper.GroupMemberMapper;
import com.flowlink.mapper.UserMapper;
import com.flowlink.realtime.ChannelRegistry;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GroupService {
  public static final int ROLE_MEMBER = 0;
  public static final int ROLE_ADMIN = 1;
  public static final int ROLE_OWNER = 2;
  private final GroupMapper groupMapper;
  private final GroupMemberMapper memberMapper;
  private final NotificationService notificationService;
  private final UserMapper userMapper;
  private final ChannelRegistry channelRegistry;

  public GroupService(GroupMapper groupMapper, GroupMemberMapper memberMapper, NotificationService notificationService, UserMapper userMapper, ChannelRegistry channelRegistry) {
    this.groupMapper = groupMapper;
    this.memberMapper = memberMapper;
    this.notificationService = notificationService;
    this.userMapper = userMapper;
    this.channelRegistry = channelRegistry;
  }

  public List<ChatGroup> myGroups(Long userId) {
    return groupMapper.findByUserId(userId);
  }

  public ChatGroup requireGroup(Long groupId) {
    ChatGroup group = groupMapper.findById(groupId);
    if (group == null) throw new BusinessException(404, "群聊不存在");
    return group;
  }

  public GroupMember requireMember(Long groupId, Long userId) {
    GroupMember member = memberMapper.findActive(groupId, userId);
    if (member == null) throw new BusinessException(403, "你不在该群聊中");
    return member;
  }

  public boolean canManage(Long groupId, Long userId) {
    GroupMember member = memberMapper.findActive(groupId, userId);
    return member != null && (member.getRole() == ROLE_ADMIN || member.getRole() == ROLE_OWNER);
  }

  @Transactional
  public ChatGroup create(Long ownerId, ChatGroup group, List<Long> memberIds) {
    group.setOwnerId(ownerId);
    group.setGroupName(defaultText(group.getGroupName(), "新的群聊"));
    group.setNotice(defaultText(group.getNotice(), ""));
    group.setDescription(defaultText(group.getDescription(), ""));
    group.setAvatarUrl(defaultText(group.getAvatarUrl(), ""));
    group.setMuteAll(Boolean.TRUE.equals(group.getMuteAll()));
    groupMapper.insert(group);
    addMember(group.getId(), ownerId, ROLE_OWNER);
    for (Long memberId : memberIds) if (!ownerId.equals(memberId)) addMember(group.getId(), memberId, ROLE_MEMBER);
    return group;
  }

  @Transactional
  public ChatGroup update(Long operatorId, Long groupId, ChatGroup patch) {
    requireManager(groupId, operatorId);
    ChatGroup group = requireGroup(groupId);
    group.setGroupName(defaultText(patch.getGroupName(), group.getGroupName()));
    group.setAvatarUrl(defaultText(patch.getAvatarUrl(), group.getAvatarUrl()));
    group.setNotice(defaultText(patch.getNotice(), group.getNotice()));
    group.setDescription(defaultText(patch.getDescription(), group.getDescription()));
    group.setMuteAll(patch.getMuteAll() == null ? Boolean.TRUE.equals(group.getMuteAll()) : Boolean.TRUE.equals(patch.getMuteAll()));
    groupMapper.update(group);
    notifyGroupMembers(groupId, operatorId, "group_updated", actorName(operatorId) + " 更新了群聊「" + group.getGroupName() + "」的资料");
    return groupMapper.findById(groupId);
  }

  @Transactional
  public void setMemberMute(Long operatorId, Long groupId, Long memberId, boolean muted) {
    requireManager(groupId, operatorId);
    GroupMember target = requireMember(groupId, memberId);
    if (target.getRole() == ROLE_OWNER) throw new BusinessException(403, "不能禁言群主");
    GroupMember operator = requireMember(groupId, operatorId);
    if (target.getRole() == ROLE_ADMIN && operator.getRole() != ROLE_OWNER) throw new BusinessException(403, "只有群主可以禁言管理员");
    target.setMuted(muted);
    target.setMutedBy(operatorId);
    memberMapper.updateMute(target);
    String groupName = requireGroup(groupId).getGroupName();
    notificationService.create(memberId, muted ? "group_muted" : "group_unmuted",
        actorName(operatorId) + (muted ? " 将你禁言于群聊「" : " 解除了你在群聊「") + groupName + "」中的禁言");
  }

  @Transactional
  public void setAdmin(Long ownerId, Long groupId, Long memberId, boolean admin) {
    GroupMember operator = requireMember(groupId, ownerId);
    if (operator.getRole() != ROLE_OWNER) throw new BusinessException(403, "只有群主可以设置管理员");
    requireMember(groupId, memberId);
    memberMapper.updateRole(groupId, memberId, admin ? ROLE_ADMIN : ROLE_MEMBER);
    String groupName = requireGroup(groupId).getGroupName();
    notificationService.create(memberId, admin ? "group_admin_set" : "group_admin_unset",
        actorName(ownerId) + (admin ? " 将你设为群聊「" : " 取消了你在群聊「") + groupName + (admin ? "」的管理员" : "」的管理员身份"));
  }

  @Transactional
  public void transferOwner(Long ownerId, Long groupId, Long memberId) {
    GroupMember operator = requireMember(groupId, ownerId);
    if (operator.getRole() != ROLE_OWNER) throw new BusinessException(403, "只有群主可以转让群主");
    requireMember(groupId, memberId);
    memberMapper.updateRole(groupId, ownerId, ROLE_ADMIN);
    memberMapper.updateRole(groupId, memberId, ROLE_OWNER);
    groupMapper.transferOwner(groupId, memberId);
    notificationService.create(memberId, "group_owner_transfer", actorName(ownerId) + " 将群聊「" + requireGroup(groupId).getGroupName() + "」转让给你");
  }

  @Transactional
  public void invite(Long operatorId, Long groupId, List<Long> memberIds) {
    requireManager(groupId, operatorId);
    ChatGroup group = requireGroup(groupId);
    for (Long memberId : memberIds) {
      addMember(groupId, memberId, ROLE_MEMBER);
      notificationService.create(memberId, "group_invited", actorName(operatorId) + " 邀请你加入群聊「" + group.getGroupName() + "」");
    }
  }

  @Transactional
  public void removeMember(Long operatorId, Long groupId, Long memberId) {
    requireManager(groupId, operatorId);
    GroupMember operator = requireMember(groupId, operatorId);
    GroupMember target = requireMember(groupId, memberId);
    if (target.getRole() == ROLE_OWNER) throw new BusinessException(403, "不能移除群主");
    if (target.getRole() == ROLE_ADMIN && operator.getRole() != ROLE_OWNER) throw new BusinessException(403, "只有群主可以移除管理员");
    memberMapper.markLeft(groupId, memberId);
    notificationService.create(memberId, "group_removed", actorName(operatorId) + " 将你移出群聊「" + requireGroup(groupId).getGroupName() + "」");
  }

  @Transactional
  public void leave(Long userId, Long groupId) {
    GroupMember member = requireMember(groupId, userId);
    if (member.getRole() == ROLE_OWNER) throw new BusinessException(403, "群主不能直接退出，请先转让群主或解散群聊");
    memberMapper.markLeft(groupId, userId);
  }

  @Transactional
  public void dissolve(Long ownerId, Long groupId) {
    GroupMember member = requireMember(groupId, ownerId);
    if (member.getRole() != ROLE_OWNER) throw new BusinessException(403, "只有群主可以解散群聊");
    groupMapper.dissolve(groupId);
  }

  public List<GroupMember> members(Long groupId) {
    return memberMapper.findActiveMembers(groupId);
  }

  @Transactional
  public void updateMyNickname(Long userId, Long groupId, String nickname) {
    requireMember(groupId, userId);
    String value = nickname == null ? "" : nickname.trim();
    if (value.length() > 50) throw new BusinessException(400, "群昵称不能超过 50 个字符");
    memberMapper.updateNickname(groupId, userId, value);
    broadcastGroupChanged(groupId, "group_member_updated", Map.of(
        "groupId", groupId,
        "userId", userId,
        "groupNickname", value
    ));
  }

  public void addMember(Long groupId, Long userId, int role) {
    GroupMember existed = memberMapper.findAny(groupId, userId);
    GroupMember member = new GroupMember();
    member.setGroupId(groupId);
    member.setUserId(userId);
    member.setRole(role);
    member.setMuted(false);
    if (existed == null) {
      memberMapper.insert(member);
    } else {
      memberMapper.restore(member);
    }
  }

  private void requireManager(Long groupId, Long userId) {
    if (!canManage(groupId, userId)) throw new BusinessException(403, "需要群主或管理员权限");
  }

  private void notifyGroupMembers(Long groupId, Long exceptUserId, String type, String content) {
    for (GroupMember member : memberMapper.findActiveMembers(groupId)) {
      if (!member.getUserId().equals(exceptUserId)) notificationService.create(member.getUserId(), type, content);
    }
  }

  private void broadcastGroupChanged(Long groupId, String action, Object payload) {
    for (GroupMember member : memberMapper.findActiveMembers(groupId)) {
      channelRegistry.send(member.getUserId(), action, payload);
    }
  }

  private String actorName(Long userId) {
    User user = userMapper.findById(userId);
    if (user == null) return "系统";
    return defaultText(user.getDisplayName(), user.getUsername());
  }

  private String defaultText(String value, String fallback) {
    return value == null || value.trim().isEmpty() ? fallback : value.trim();
  }
}
