package com.flowlink.service;

import com.flowlink.common.BusinessException;
import com.flowlink.domain.ChatGroup;
import com.flowlink.domain.GroupMember;
import com.flowlink.mapper.GroupMapper;
import com.flowlink.mapper.GroupMemberMapper;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GroupService {
  public static final int ROLE_MEMBER = 0;
  public static final int ROLE_ADMIN = 1;
  public static final int ROLE_OWNER = 2;
  private final GroupMapper groupMapper;
  private final GroupMemberMapper memberMapper;

  public GroupService(GroupMapper groupMapper, GroupMemberMapper memberMapper) {
    this.groupMapper = groupMapper;
    this.memberMapper = memberMapper;
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
    group.setGroupName(patch.getGroupName());
    group.setAvatarUrl(patch.getAvatarUrl());
    group.setNotice(patch.getNotice());
    group.setDescription(patch.getDescription());
    group.setMuteAll(Boolean.TRUE.equals(patch.getMuteAll()));
    groupMapper.update(group);
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
  }

  @Transactional
  public void setAdmin(Long ownerId, Long groupId, Long memberId, boolean admin) {
    GroupMember operator = requireMember(groupId, ownerId);
    if (operator.getRole() != ROLE_OWNER) throw new BusinessException(403, "只有群主可以设置管理员");
    requireMember(groupId, memberId);
    memberMapper.updateRole(groupId, memberId, admin ? ROLE_ADMIN : ROLE_MEMBER);
  }

  @Transactional
  public void transferOwner(Long ownerId, Long groupId, Long memberId) {
    GroupMember operator = requireMember(groupId, ownerId);
    if (operator.getRole() != ROLE_OWNER) throw new BusinessException(403, "只有群主可以转让群主");
    requireMember(groupId, memberId);
    memberMapper.updateRole(groupId, ownerId, ROLE_ADMIN);
    memberMapper.updateRole(groupId, memberId, ROLE_OWNER);
    groupMapper.transferOwner(groupId, memberId);
  }

  @Transactional
  public void invite(Long operatorId, Long groupId, List<Long> memberIds) {
    requireManager(groupId, operatorId);
    for (Long memberId : memberIds) addMember(groupId, memberId, ROLE_MEMBER);
  }

  @Transactional
  public void removeMember(Long operatorId, Long groupId, Long memberId) {
    requireManager(groupId, operatorId);
    GroupMember operator = requireMember(groupId, operatorId);
    GroupMember target = requireMember(groupId, memberId);
    if (target.getRole() == ROLE_OWNER) throw new BusinessException(403, "不能移除群主");
    if (target.getRole() == ROLE_ADMIN && operator.getRole() != ROLE_OWNER) throw new BusinessException(403, "只有群主可以移除管理员");
    memberMapper.markLeft(groupId, memberId);
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
}
