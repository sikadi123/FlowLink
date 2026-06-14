USE flowlink;

ALTER TABLE `file_record`
  ADD COLUMN `access_url` VARCHAR(512) NULL AFTER `storage_path`;

ALTER TABLE `message`
  MODIFY COLUMN `content` VARCHAR(1024) NOT NULL COMMENT 'Text content or object storage access URL for file/image messages';
