package com.flowlink.mapper;

import com.flowlink.domain.User;
import java.util.List;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface FriendshipMapper {
  @Select("""
      select u.* from friendship f
      join `user` u on u.id = f.friend_id
      where f.user_id = #{userId} and f.status = 1
      order by u.display_name
      """)
  List<User> findFriends(@Param("userId") Long userId);

  @Select("select count(*) from friendship where user_id = #{userId} and friend_id = #{friendId} and status = 1")
  int countFriendship(@Param("userId") Long userId, @Param("friendId") Long friendId);

  @Select("select count(*) from friendship where user_id = #{userId} and friend_id = #{friendId} and status = 2")
  int countBlocked(@Param("userId") Long userId, @Param("friendId") Long friendId);

  @Select("select count(*) from friendship where user_id = #{userId} and friend_id = #{friendId}")
  int countAny(@Param("userId") Long userId, @Param("friendId") Long friendId);

  @Insert("""
      insert into friendship(user_id, friend_id, status)
      values(#{userId}, #{friendId}, 1)
      """)
  void insert(@Param("userId") Long userId, @Param("friendId") Long friendId);

  @Update("update friendship set status = 1 where user_id = #{userId} and friend_id = #{friendId}")
  void restore(@Param("userId") Long userId, @Param("friendId") Long friendId);

  @Update("update friendship set status = 0 where user_id = #{userId} and friend_id = #{friendId}")
  void delete(@Param("userId") Long userId, @Param("friendId") Long friendId);

  @Update("update friendship set status = 2 where user_id = #{userId} and friend_id = #{friendId}")
  void block(@Param("userId") Long userId, @Param("friendId") Long friendId);
}
