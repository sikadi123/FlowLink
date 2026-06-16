SET NAMES utf8mb4;
USE flowlink;

SET @has_group_nickname = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'group_member'
    AND column_name = 'nickname_in_group'
);
SET @group_nickname_sql = IF(
  @has_group_nickname = 0,
  'ALTER TABLE group_member ADD COLUMN nickname_in_group VARCHAR(50) NULL AFTER role',
  'SELECT 1'
);
PREPARE stmt FROM @group_nickname_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

INSERT INTO `user`
  (`id`, `username`, `email`, `password_hash`, `display_name`, `avatar_url`, `bio`, `role_title`, `department`, `status_message`, `status`)
VALUES
  (9001, 'flowlink_ai', 'ai@flowlink.local', 'demo:flowlink123', 'FlowLink AI 助手', 'linear-gradient(135deg,#07c160,#2f80ed)', '可以帮助你整理项目答辩、解释功能和回答聊天中的问题。', 'AI Assistant', 'FlowLink', '随时在线，帮你整理思路。', 3)
ON DUPLICATE KEY UPDATE
  display_name = VALUES(display_name),
  avatar_url = VALUES(avatar_url),
  bio = VALUES(bio),
  role_title = VALUES(role_title),
  department = VALUES(department),
  status_message = VALUES(status_message),
  status = VALUES(status);

INSERT IGNORE INTO friendship(user_id, friend_id, status)
SELECT u.id, 9001, 1 FROM `user` u WHERE u.id <> 9001;

INSERT IGNORE INTO friendship(user_id, friend_id, status)
SELECT 9001, u.id, 1 FROM `user` u WHERE u.id <> 9001;
