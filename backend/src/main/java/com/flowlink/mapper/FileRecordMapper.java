package com.flowlink.mapper;

import com.flowlink.domain.FileRecord;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Options;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface FileRecordMapper {
  @Insert("""
      insert into file_record(uploader_id, message_id, file_name, storage_path, access_url, file_size, file_type)
      values(#{uploaderId}, #{messageId}, #{fileName}, #{storagePath}, #{accessUrl}, #{fileSize}, #{fileType})
      """)
  @Options(useGeneratedKeys = true, keyProperty = "id")
  void insert(FileRecord fileRecord);

  @Update("update file_record set message_id = #{messageId} where id = #{id}")
  void bindMessage(FileRecord fileRecord);
}
