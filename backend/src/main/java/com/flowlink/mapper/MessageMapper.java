package com.flowlink.mapper;

import com.flowlink.domain.Message;
import java.util.List;
import org.apache.ibatis.annotations.Delete;
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
      select
        id,
        conversation_type,
        sender_id,
        receiver_id,
        group_id,
        content,
        message_type,
        client_id,
        send_time,
        is_recalled as recalled,
        recall_time
      from message
      where id = #{id}
      """)
  Message findFullById(@Param("id") Long id);

  @Select("""
      <script>
      select
        m.id,
        m.conversation_type,
        m.sender_id,
        m.receiver_id,
        m.group_id,
        m.content,
        m.message_type,
        m.client_id,
        m.send_time,
        m.is_recalled as recalled,
        m.recall_time,
        f.id as file_record_id,
        f.file_name,
        f.file_size,
        f.file_type,
        f.access_url as file_url
      from message m
      left join file_record f on f.message_id = m.id
      where m.conversation_type = 1
        and ((m.sender_id = #{userId} and m.receiver_id = #{targetId}) or (m.sender_id = #{targetId} and m.receiver_id = #{userId}))
        <if test="beforeId != null">
          and m.id &lt; #{beforeId}
        </if>
      order by m.send_time asc
      limit #{limit}
      </script>
      """)
  List<Message> privateHistory(@Param("userId") Long userId, @Param("targetId") Long targetId, @Param("beforeId") Long beforeId, @Param("limit") int limit);

  @Select("""
      <script>
      select
        m.id,
        m.conversation_type,
        m.sender_id,
        m.receiver_id,
        m.group_id,
        m.content,
        m.message_type,
        m.client_id,
        m.send_time,
        m.is_recalled as recalled,
        m.recall_time,
        f.id as file_record_id,
        f.file_name,
        f.file_size,
        f.file_type,
        f.access_url as file_url
      from message m
      left join file_record f on f.message_id = m.id
      where m.conversation_type = 2 and m.group_id = #{groupId}
      <if test="beforeId != null">
        and m.id &lt; #{beforeId}
      </if>
      order by m.send_time asc
      limit #{limit}
      </script>
      """)
  List<Message> groupHistory(@Param("groupId") Long groupId, @Param("beforeId") Long beforeId, @Param("limit") int limit);

  @Select("""
      select
        id,
        conversation_type,
        sender_id,
        receiver_id,
        group_id,
        content,
        message_type,
        client_id,
        send_time,
        is_recalled as recalled,
        recall_time
      from message
      where id = #{id}
      """)
  Message findById(@Param("id") Long id);

  @Update("update message set is_recalled = 1, recall_time = now() where id = #{id}")
  void recall(@Param("id") Long id);

  @Update("update file_record set message_id = null where message_id = #{id}")
  void unbindFiles(@Param("id") Long id);

  @Delete("delete from message_receipt where message_id = #{id}")
  void deleteReceipts(@Param("id") Long id);

  @Delete("delete from message where id = #{id}")
  int deleteById(@Param("id") Long id);
}
