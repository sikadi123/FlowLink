package com.flowlink.mapper;

import com.flowlink.domain.GroupMember;
import java.util.List;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface GroupMemberMapper {
  @Select("select * from group_member where group_id = #{groupId} and user_id = #{userId} and status = 1")
  GroupMember findActive(@Param("groupId") Long groupId, @Param("userId") Long userId);

  @Select("select * from group_member where group_id = #{groupId} and user_id = #{userId}")
  GroupMember findAny(@Param("groupId") Long groupId, @Param("userId") Long userId);

  @Select("select * from group_member where group_id = #{groupId} and status = 1")
  List<GroupMember> findActiveMembers(@Param("groupId") Long groupId);

  @Insert("""
      insert into group_member(group_id, user_id, role, muted, status)
      values(#{groupId}, #{userId}, #{role}, #{muted}, 1)
      """)
  void insert(GroupMember member);

  @Update("update group_member set status = 1, role = #{role}, muted = #{muted} where group_id = #{groupId} and user_id = #{userId}")
  void restore(GroupMember member);

  @Update("update group_member set role = #{role} where group_id = #{groupId} and user_id = #{userId}")
  void updateRole(@Param("groupId") Long groupId, @Param("userId") Long userId, @Param("role") int role);

  @Update("update group_member set muted = #{muted}, muted_by = #{mutedBy}, muted_until = #{mutedUntil} where group_id = #{groupId} and user_id = #{userId}")
  void updateMute(GroupMember member);

  @Update("update group_member set status = 0 where group_id = #{groupId} and user_id = #{userId}")
  void markLeft(@Param("groupId") Long groupId, @Param("userId") Long userId);
}
