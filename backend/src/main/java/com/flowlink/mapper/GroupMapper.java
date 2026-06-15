package com.flowlink.mapper;

import com.flowlink.domain.ChatGroup;
import java.util.List;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Options;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface GroupMapper {
  @Select("select * from chat_group where id = #{id} and status = 1")
  ChatGroup findById(@Param("id") Long id);

  @Select("""
      select g.* from chat_group g
      join group_member gm on gm.group_id = g.id
      where gm.user_id = #{userId} and gm.status = 1 and g.status = 1
      order by g.updated_at desc
      """)
  List<ChatGroup> findByUserId(@Param("userId") Long userId);

  @Insert("""
      insert into chat_group(group_name, owner_id, avatar_url, notice, description, mute_all, status)
      values(#{groupName}, #{ownerId}, #{avatarUrl}, #{notice}, #{description}, #{muteAll}, 1)
      """)
  @Options(useGeneratedKeys = true, keyProperty = "id")
  void insert(ChatGroup group);

  @Update("""
      update chat_group set group_name=#{groupName}, avatar_url=#{avatarUrl}, notice=#{notice},
      description=#{description}, mute_all=#{muteAll}
      where id=#{id}
      """)
  void update(ChatGroup group);

  @Update("update chat_group set owner_id=#{ownerId} where id=#{groupId}")
  void transferOwner(@Param("groupId") Long groupId, @Param("ownerId") Long ownerId);

  @Update("update chat_group set status = 0 where id = #{groupId}")
  void dissolve(@Param("groupId") Long groupId);
}
