package com.flowlink.mapper;

import com.flowlink.domain.Notification;
import java.util.List;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Options;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface NotificationMapper {
  @Select("""
      select id, receiver_id, type, content, is_read as `read`, created_at
      from notification
      where receiver_id = #{receiverId}
      order by created_at desc
      limit 50
      """)
  List<Notification> findByReceiver(@Param("receiverId") Long receiverId);

  @Insert("""
      insert into notification(receiver_id, type, content, is_read)
      values(#{receiverId}, #{type}, #{content}, #{read})
      """)
  @Options(useGeneratedKeys = true, keyProperty = "id")
  void insert(Notification notification);

  @Update("update notification set is_read = 1 where receiver_id = #{receiverId}")
  void markAllRead(@Param("receiverId") Long receiverId);

  @Delete("delete from notification where id = #{id} and receiver_id = #{receiverId}")
  int deleteOne(@Param("receiverId") Long receiverId, @Param("id") Long id);

  @Delete("delete from notification where receiver_id = #{receiverId}")
  int deleteAll(@Param("receiverId") Long receiverId);
}
