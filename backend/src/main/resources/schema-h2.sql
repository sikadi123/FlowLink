DROP TABLE IF EXISTS admin_log;
DROP TABLE IF EXISTS user_session;
DROP TABLE IF EXISTS notification;
DROP TABLE IF EXISTS file_record;
DROP TABLE IF EXISTS message_receipt;
DROP TABLE IF EXISTS message;
DROP TABLE IF EXISTS group_member;
DROP TABLE IF EXISTS chat_group;
DROP TABLE IF EXISTS friend_request;
DROP TABLE IF EXISTS friendship;
DROP TABLE IF EXISTS `user`;

CREATE TABLE `user` (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(50) NOT NULL,
  avatar_url VARCHAR(255),
  bio VARCHAR(200),
  role_title VARCHAR(50),
  department VARCHAR(50),
  phone VARCHAR(30),
  location VARCHAR(50),
  status_message VARCHAR(120),
  status TINYINT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE friendship (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  friend_id BIGINT NOT NULL,
  remark VARCHAR(50),
  status TINYINT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE friend_request (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  sender_id BIGINT NOT NULL,
  receiver_id BIGINT NOT NULL,
  message VARCHAR(120),
  status TINYINT DEFAULT 0,
  request_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  handle_time DATETIME
);

CREATE TABLE chat_group (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  group_name VARCHAR(100) NOT NULL,
  owner_id BIGINT NOT NULL,
  avatar_url VARCHAR(255),
  notice VARCHAR(200),
  description VARCHAR(300),
  max_member INT DEFAULT 500,
  muted TINYINT DEFAULT 0,
  mute_all TINYINT DEFAULT 0,
  status TINYINT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE group_member (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  group_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  role TINYINT DEFAULT 0,
  nickname_in_group VARCHAR(50),
  muted TINYINT DEFAULT 0,
  muted_by BIGINT,
  muted_until DATETIME,
  join_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TINYINT DEFAULT 1,
  UNIQUE(group_id, user_id)
);

CREATE TABLE message (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  conversation_type TINYINT NOT NULL,
  sender_id BIGINT NOT NULL,
  receiver_id BIGINT,
  group_id BIGINT,
  content VARCHAR(1024) NOT NULL,
  message_type TINYINT DEFAULT 1,
  client_id VARCHAR(80),
  send_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_recalled TINYINT DEFAULT 0,
  recall_time DATETIME
);

CREATE TABLE message_receipt (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  message_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  deliver_status TINYINT DEFAULT 0,
  delivered_at DATETIME,
  read_at DATETIME
);

CREATE TABLE file_record (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  uploader_id BIGINT NOT NULL,
  message_id BIGINT,
  file_name VARCHAR(255) NOT NULL,
  storage_path VARCHAR(255) NOT NULL,
  access_url VARCHAR(512),
  file_size BIGINT NOT NULL,
  file_type VARCHAR(80),
  upload_time DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notification (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  receiver_id BIGINT NOT NULL,
  type VARCHAR(40) NOT NULL,
  content VARCHAR(255) NOT NULL,
  is_read TINYINT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_session (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  token_hash VARCHAR(128) NOT NULL,
  client_type VARCHAR(30) DEFAULT 'web',
  ip_address VARCHAR(64),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  revoked_at DATETIME
);

CREATE TABLE admin_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  admin_id BIGINT NOT NULL,
  operation_type VARCHAR(50) NOT NULL,
  target_user_id BIGINT,
  target_group_id BIGINT,
  operation_detail TEXT,
  operation_time DATETIME DEFAULT CURRENT_TIMESTAMP
);
