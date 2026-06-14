package com.flowlink.mapper;

import com.flowlink.domain.User;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface FriendshipMapper {
  @Select("""
      select u.* from friendship f
      join user u on u.id = f.friend_id
      where f.user_id = #{userId} and f.status = 1
      order by u.display_name
      """)
  List<User> findFriends(Long userId);
}
