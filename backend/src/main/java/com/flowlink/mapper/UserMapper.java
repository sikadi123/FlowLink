package com.flowlink.mapper;

import com.flowlink.domain.User;
import java.util.List;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Options;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface UserMapper {
  @Select("select * from `user` where id = #{id}")
  User findById(Long id);

  @Select("select * from `user` where username = #{account} or email = #{account} limit 1")
  User findByAccount(String account);

  @Select("select count(*) from `user` where username = #{username} or email = #{email}")
  int countByUsernameOrEmail(@Param("username") String username, @Param("email") String email);

  @Select("""
      select * from `user`
      where username like concat('%', #{keyword}, '%')
         or display_name like concat('%', #{keyword}, '%')
      order by display_name
      limit 30
      """)
  List<User> search(String keyword);

  @Insert("""
      insert into `user`(username, email, password_hash, display_name, avatar_url, bio, role_title, department, phone, location, status_message, status)
      values(#{username}, #{email}, #{passwordHash}, #{displayName}, #{avatarUrl}, #{bio}, #{roleTitle}, #{department}, #{phone}, #{location}, #{statusMessage}, #{status})
      """)
  @Options(useGeneratedKeys = true, keyProperty = "id")
  void insert(User user);

  @Update("""
      update `user` set display_name=#{displayName}, username=#{username}, email=#{email}, avatar_url=#{avatarUrl},
      bio=#{bio}, role_title=#{roleTitle}, department=#{department}, phone=#{phone}, location=#{location},
      status_message=#{statusMessage}
      where id=#{id}
      """)
  void updateProfile(User user);

  @Update("update `user` set status = #{status} where id = #{id}")
  void updateStatus(@Param("id") Long id, @Param("status") int status);
}
