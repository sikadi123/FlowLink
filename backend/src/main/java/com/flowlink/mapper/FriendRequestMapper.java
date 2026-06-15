package com.flowlink.mapper;

import com.flowlink.domain.FriendRequest;
import java.util.List;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Options;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface FriendRequestMapper {
  @Select("select * from friend_request where id = #{id}")
  FriendRequest findById(@Param("id") Long id);

  @Select("""
      select * from friend_request
      where sender_id = #{userId} or receiver_id = #{userId}
      order by request_time desc
      limit 50
      """)
  List<FriendRequest> findByUser(@Param("userId") Long userId);

  @Select("""
      select count(*) from friend_request
      where sender_id = #{senderId} and receiver_id = #{receiverId} and status = 0
      """)
  int countPending(@Param("senderId") Long senderId, @Param("receiverId") Long receiverId);

  @Insert("""
      insert into friend_request(sender_id, receiver_id, message, status)
      values(#{senderId}, #{receiverId}, #{message}, 0)
      """)
  @Options(useGeneratedKeys = true, keyProperty = "id")
  void insert(FriendRequest request);

  @Update("update friend_request set status = #{status}, handle_time = now() where id = #{id}")
  void updateStatus(@Param("id") Long id, @Param("status") int status);
}
