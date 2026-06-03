CREATE DATABASE IF NOT EXISTS flowlink DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE flowlink;

CREATE TABLE IF NOT EXISTS `user` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '用户ID',
  `username` VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名/账号',
  `email` VARCHAR(100) UNIQUE COMMENT '邮箱',
  `password_hash` VARCHAR(255) NOT NULL COMMENT '密码哈希值',
  `display_name` VARCHAR(50) NOT NULL COMMENT '昵称',
  `avatar_url` VARCHAR(255) COMMENT '头像URL',
  `bio` VARCHAR(200) COMMENT '个人签名',
  `status` TINYINT DEFAULT 1 COMMENT '0禁用 1正常 2离线 3在线',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_username` (`username`),
  INDEX `idx_email` (`email`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户基本信息表';

CREATE TABLE IF NOT EXISTS `friendship` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `friend_id` BIGINT NOT NULL COMMENT '好友ID',
  `remark` VARCHAR(50) COMMENT '好友备注',
  `status` TINYINT DEFAULT 1 COMMENT '0删除 1正常',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_user_friend` (`user_id`, `friend_id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_friend_id` (`friend_id`),
  CONSTRAINT `fk_friendship_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`),
  CONSTRAINT `fk_friendship_friend` FOREIGN KEY (`friend_id`) REFERENCES `user`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='好友关系表';

CREATE TABLE IF NOT EXISTS `friend_request` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `sender_id` BIGINT NOT NULL COMMENT '发送方',
  `receiver_id` BIGINT NOT NULL COMMENT '接收方',
  `message` VARCHAR(100) COMMENT '申请附言',
  `status` TINYINT DEFAULT 0 COMMENT '0待处理 1同意 2拒绝 3过期',
  `request_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `handle_time` DATETIME COMMENT '处理时间',
  INDEX `idx_sender` (`sender_id`),
  INDEX `idx_receiver` (`receiver_id`),
  CONSTRAINT `fk_friend_request_sender` FOREIGN KEY (`sender_id`) REFERENCES `user`(`id`),
  CONSTRAINT `fk_friend_request_receiver` FOREIGN KEY (`receiver_id`) REFERENCES `user`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='好友申请表';

CREATE TABLE IF NOT EXISTS `chat_group` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `group_name` VARCHAR(100) NOT NULL,
  `owner_id` BIGINT NOT NULL COMMENT '群主ID',
  `avatar_url` VARCHAR(255),
  `description` VARCHAR(200) COMMENT '群公告',
  `max_member` INT DEFAULT 500,
  `status` TINYINT DEFAULT 1 COMMENT '0解散 1正常',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_owner` (`owner_id`),
  CONSTRAINT `fk_chat_group_owner` FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='群组信息表';

CREATE TABLE IF NOT EXISTS `group_member` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `group_id` BIGINT NOT NULL,
  `user_id` BIGINT NOT NULL,
  `role` TINYINT DEFAULT 0 COMMENT '0普通 1管理 2群主',
  `nickname_in_group` VARCHAR(50) COMMENT '群昵称',
  `join_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `status` TINYINT DEFAULT 1 COMMENT '0退出 1正常',
  UNIQUE KEY `uk_group_user` (`group_id`, `user_id`),
  INDEX `idx_group_id` (`group_id`),
  INDEX `idx_user_id` (`user_id`),
  CONSTRAINT `fk_group_member_group` FOREIGN KEY (`group_id`) REFERENCES `chat_group`(`id`),
  CONSTRAINT `fk_group_member_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='群成员关系表';

CREATE TABLE IF NOT EXISTS `message` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `conversation_type` TINYINT NOT NULL COMMENT '1私聊 2群聊',
  `sender_id` BIGINT NOT NULL,
  `receiver_id` BIGINT COMMENT '私聊用',
  `group_id` BIGINT COMMENT '群聊用',
  `content` TEXT NOT NULL,
  `message_type` TINYINT DEFAULT 1 COMMENT '1文本 2图片 3文件 4语音 5系统',
  `send_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `is_recalled` TINYINT DEFAULT 0 COMMENT '是否撤回',
  `recall_time` DATETIME,
  INDEX `idx_private_history` (`conversation_type`, `sender_id`, `receiver_id`, `send_time`),
  INDEX `idx_group_history` (`group_id`, `send_time`),
  CONSTRAINT `fk_message_sender` FOREIGN KEY (`sender_id`) REFERENCES `user`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='消息记录表';

CREATE TABLE IF NOT EXISTS `message_receipt` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `message_id` BIGINT NOT NULL,
  `user_id` BIGINT NOT NULL,
  `deliver_status` TINYINT DEFAULT 0 COMMENT '0待投递 1已送达 2已读',
  `delivered_at` DATETIME,
  `read_at` DATETIME,
  UNIQUE KEY `uk_message_user` (`message_id`, `user_id`),
  INDEX `idx_receipt_user` (`user_id`, `deliver_status`),
  CONSTRAINT `fk_receipt_message` FOREIGN KEY (`message_id`) REFERENCES `message`(`id`),
  CONSTRAINT `fk_receipt_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='消息投递与已读回执表';

CREATE TABLE IF NOT EXISTS `file_record` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `uploader_id` BIGINT NOT NULL,
  `message_id` BIGINT COMMENT '关联消息ID',
  `file_name` VARCHAR(255) NOT NULL,
  `storage_path` VARCHAR(255) NOT NULL,
  `file_size` BIGINT NOT NULL,
  `file_type` VARCHAR(50),
  `upload_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_uploader` (`uploader_id`),
  INDEX `idx_message` (`message_id`),
  CONSTRAINT `fk_file_uploader` FOREIGN KEY (`uploader_id`) REFERENCES `user`(`id`),
  CONSTRAINT `fk_file_message` FOREIGN KEY (`message_id`) REFERENCES `message`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文件上传记录表';

CREATE TABLE IF NOT EXISTS `notification` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `receiver_id` BIGINT NOT NULL,
  `type` TINYINT NOT NULL COMMENT '1好友申请 2群邀请 3公告 4申请结果',
  `content` VARCHAR(255) NOT NULL,
  `is_read` TINYINT DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_notification_receiver` (`receiver_id`, `is_read`, `created_at`),
  CONSTRAINT `fk_notification_receiver` FOREIGN KEY (`receiver_id`) REFERENCES `user`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统通知表';

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='登录会话表';

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理员操作日志表';
