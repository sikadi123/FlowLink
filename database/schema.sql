SET NAMES utf8mb4;
SET character_set_client = utf8mb4;
SET character_set_connection = utf8mb4;
SET character_set_results = utf8mb4;

CREATE DATABASE IF NOT EXISTS flowlink DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE flowlink;

CREATE TABLE IF NOT EXISTS `user` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `email` VARCHAR(100) UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `display_name` VARCHAR(50) NOT NULL,
  `avatar_url` VARCHAR(255),
  `bio` VARCHAR(200),
  `role_title` VARCHAR(50),
  `department` VARCHAR(50),
  `phone` VARCHAR(30),
  `location` VARCHAR(50),
  `status_message` VARCHAR(120),
  `status` TINYINT DEFAULT 1 COMMENT '0 disabled, 1 normal, 2 offline, 3 online',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_username` (`username`),
  INDEX `idx_email` (`email`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='User profile';

CREATE TABLE IF NOT EXISTS `friendship` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `friend_id` BIGINT NOT NULL,
  `remark` VARCHAR(50),
  `status` TINYINT DEFAULT 1 COMMENT '0 deleted, 1 normal',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_user_friend` (`user_id`, `friend_id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_friend_id` (`friend_id`),
  CONSTRAINT `fk_friendship_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`),
  CONSTRAINT `fk_friendship_friend` FOREIGN KEY (`friend_id`) REFERENCES `user`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Friend relation';

CREATE TABLE IF NOT EXISTS `friend_request` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `sender_id` BIGINT NOT NULL,
  `receiver_id` BIGINT NOT NULL,
  `message` VARCHAR(120),
  `status` TINYINT DEFAULT 0 COMMENT '0 pending, 1 accepted, 2 rejected, 3 expired',
  `request_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `handle_time` DATETIME,
  INDEX `idx_sender` (`sender_id`),
  INDEX `idx_receiver` (`receiver_id`),
  CONSTRAINT `fk_friend_request_sender` FOREIGN KEY (`sender_id`) REFERENCES `user`(`id`),
  CONSTRAINT `fk_friend_request_receiver` FOREIGN KEY (`receiver_id`) REFERENCES `user`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Friend request';

CREATE TABLE IF NOT EXISTS `chat_group` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `group_name` VARCHAR(100) NOT NULL,
  `owner_id` BIGINT NOT NULL,
  `avatar_url` VARCHAR(255),
  `notice` VARCHAR(200),
  `description` VARCHAR(300),
  `max_member` INT DEFAULT 500,
  `muted` TINYINT DEFAULT 0 COMMENT 'Current user notification mute flag in client model',
  `mute_all` TINYINT DEFAULT 0 COMMENT '1 means ordinary members cannot speak',
  `status` TINYINT DEFAULT 1 COMMENT '0 dissolved, 1 normal',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_owner` (`owner_id`),
  INDEX `idx_group_status` (`status`),
  CONSTRAINT `fk_chat_group_owner` FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Group profile';

CREATE TABLE IF NOT EXISTS `group_member` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `group_id` BIGINT NOT NULL,
  `user_id` BIGINT NOT NULL,
  `role` TINYINT DEFAULT 0 COMMENT '0 member, 1 admin, 2 owner',
  `nickname_in_group` VARCHAR(50),
  `muted` TINYINT DEFAULT 0 COMMENT '1 means this member cannot speak',
  `muted_by` BIGINT,
  `muted_until` DATETIME,
  `join_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `status` TINYINT DEFAULT 1 COMMENT '0 left, 1 active',
  UNIQUE KEY `uk_group_user` (`group_id`, `user_id`),
  INDEX `idx_group_id` (`group_id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_member_mute` (`group_id`, `muted`),
  CONSTRAINT `fk_group_member_group` FOREIGN KEY (`group_id`) REFERENCES `chat_group`(`id`),
  CONSTRAINT `fk_group_member_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`),
  CONSTRAINT `fk_group_member_muted_by` FOREIGN KEY (`muted_by`) REFERENCES `user`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Group member relation';

CREATE TABLE IF NOT EXISTS `message` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `conversation_type` TINYINT NOT NULL COMMENT '1 private, 2 group',
  `sender_id` BIGINT NOT NULL,
  `receiver_id` BIGINT,
  `group_id` BIGINT,
  `content` MEDIUMTEXT NOT NULL,
  `message_type` TINYINT DEFAULT 1 COMMENT '1 text, 2 image, 3 file, 4 voice, 5 system',
  `client_id` VARCHAR(80),
  `send_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `is_recalled` TINYINT DEFAULT 0,
  `recall_time` DATETIME,
  INDEX `idx_private_history` (`conversation_type`, `sender_id`, `receiver_id`, `send_time`),
  INDEX `idx_group_history` (`group_id`, `send_time`),
  INDEX `idx_client_id` (`client_id`),
  CONSTRAINT `fk_message_sender` FOREIGN KEY (`sender_id`) REFERENCES `user`(`id`),
  CONSTRAINT `fk_message_receiver` FOREIGN KEY (`receiver_id`) REFERENCES `user`(`id`),
  CONSTRAINT `fk_message_group` FOREIGN KEY (`group_id`) REFERENCES `chat_group`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Message record';

CREATE TABLE IF NOT EXISTS `message_receipt` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `message_id` BIGINT NOT NULL,
  `user_id` BIGINT NOT NULL,
  `deliver_status` TINYINT DEFAULT 0 COMMENT '0 pending, 1 delivered, 2 read',
  `delivered_at` DATETIME,
  `read_at` DATETIME,
  UNIQUE KEY `uk_message_user` (`message_id`, `user_id`),
  INDEX `idx_receipt_user` (`user_id`, `deliver_status`),
  CONSTRAINT `fk_receipt_message` FOREIGN KEY (`message_id`) REFERENCES `message`(`id`),
  CONSTRAINT `fk_receipt_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Delivery and read receipt';

CREATE TABLE IF NOT EXISTS `file_record` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `uploader_id` BIGINT NOT NULL,
  `message_id` BIGINT,
  `file_name` VARCHAR(255) NOT NULL,
  `storage_path` VARCHAR(255) NOT NULL,
  `access_url` VARCHAR(512),
  `file_size` BIGINT NOT NULL,
  `file_type` VARCHAR(80),
  `upload_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_uploader` (`uploader_id`),
  INDEX `idx_message` (`message_id`),
  CONSTRAINT `fk_file_uploader` FOREIGN KEY (`uploader_id`) REFERENCES `user`(`id`),
  CONSTRAINT `fk_file_message` FOREIGN KEY (`message_id`) REFERENCES `message`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Uploaded file metadata';

CREATE TABLE IF NOT EXISTS `notification` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `receiver_id` BIGINT NOT NULL,
  `type` VARCHAR(40) NOT NULL,
  `content` VARCHAR(255) NOT NULL,
  `is_read` TINYINT DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_notification_receiver` (`receiver_id`, `is_read`, `created_at`),
  CONSTRAINT `fk_notification_receiver` FOREIGN KEY (`receiver_id`) REFERENCES `user`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='System notification';

CREATE TABLE IF NOT EXISTS `user_session` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `token_hash` VARCHAR(128) NOT NULL,
  `client_type` VARCHAR(30) DEFAULT 'web',
  `ip_address` VARCHAR(64),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `expires_at` DATETIME,
  `revoked_at` DATETIME,
  UNIQUE KEY `uk_token_hash` (`token_hash`),
  INDEX `idx_session_user` (`user_id`),
  CONSTRAINT `fk_session_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Login session';

CREATE TABLE IF NOT EXISTS `admin_log` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `admin_id` BIGINT NOT NULL,
  `operation_type` VARCHAR(50) NOT NULL,
  `target_user_id` BIGINT,
  `target_group_id` BIGINT,
  `operation_detail` TEXT,
  `operation_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_admin_time` (`admin_id`, `operation_time`),
  INDEX `idx_operation_type` (`operation_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Admin operation log';
