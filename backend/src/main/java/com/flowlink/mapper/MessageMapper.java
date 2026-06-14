package com.flowlink.mapper;

import com.flowlink.domain.Message;
import java.util.List;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Options;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface MessageMapper {
  @Insert("""
      insert into message(conversation_type, sender_id, receiver_id, group_id, content, message_type, client_id)
      values(#{conversationType}, #{senderId}, #{receiverId}, #{groupId}, #{content}, #{messageType}, #{clientId})
      """)
  @Options(useGeneratedKeys = true, keyProperty = "id")
  void insert(Message message);

  @Select("""
      select * from message
      where conversation_type = 1
        and ((sender_id = #{userId} and receiver_id = #{targetId}) or (sender_id = #{targetId} and receiver_id = #{userId}))
      order by send_time asc
      limit #{limit}
      """)
  List<Message> privateHistory(@Param("userId") Long userId, @Param("targetId") Long targetId, @Param("limit") int limit);

  @Select("select * from message where conversation_type = 2 and group_id = #{groupId} order by send_time asc limit #{limit}")
  List<Message> groupHistory(@Param("groupId") Long groupId, @Param("limit") int limit);

  @Select("select * from message where id = #{id}")
  Message findById(Long id);

  @Update("update message set is_recalled = 1, recall_time = now() where id = #{id}")
  void recall(Long id);
}
