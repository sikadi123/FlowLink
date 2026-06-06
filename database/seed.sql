USE flowlink;

INSERT INTO `user` (`id`, `username`, `email`, `password_hash`, `display_name`, `bio`, `status`) VALUES
  (1001, 'linche', 'linche@flowlink.local', 'demo:flowlink123', '林澈', '负责微信风格 UI 和交互体验。', 2),
  (1002, 'shenyan', 'shenyan@flowlink.local', 'demo:flowlink123', '沈砚', '关注 Netty 长连接、ACK 与消息路由。', 2),
  (1003, 'xuzhihang', 'xuzhihang@flowlink.local', 'demo:flowlink123', '许知航', '负责实时状态管理和消息幂等。', 2),
  (1004, 'zhouyu', 'zhouyu@flowlink.local', 'demo:flowlink123', '周屿', '负责 JWT、Redis 网关和敏感词策略。', 2),
  (1005, 'yelan', 'yelan@flowlink.local', 'demo:flowlink123', '叶岚', '负责 MySQL、MinIO 和数据映射。', 2),
  (1006, 'songyao', 'songyao@flowlink.local', 'demo:flowlink123', '宋遥', '负责用户、好友和群组业务闭环。', 2);

INSERT INTO `friendship` (`user_id`, `friend_id`) VALUES
  (1001, 1002), (1002, 1001),
  (1001, 1003), (1003, 1001),
  (1001, 1004), (1004, 1001),
  (1002, 1003), (1003, 1002),
  (1002, 1005), (1005, 1002),
  (1004, 1006), (1006, 1004);

INSERT INTO `friend_request` (`sender_id`, `receiver_id`, `message`, `status`) VALUES
  (1005, 1001, '数据库这边已经准备好表结构了，拉我进前端联调。', 0);

INSERT INTO `chat_group` (`id`, `group_name`, `owner_id`, `description`) VALUES
  (2001, 'A2607 FlowLink 项目组', 1002, '目标：先跑通聊天闭环，再补齐可靠性与工程化。'),
  (2002, '前端体验联调', 1001, '重点检查消息气泡、未读、重连和输入反馈。');

INSERT INTO `group_member` (`group_id`, `user_id`, `role`) VALUES
  (2001, 1001, 0), (2001, 1002, 2), (2001, 1003, 0), (2001, 1004, 0), (2001, 1005, 0), (2001, 1006, 0),
  (2002, 1001, 2), (2002, 1002, 0), (2002, 1003, 0);

INSERT INTO `message` (`conversation_type`, `sender_id`, `receiver_id`, `group_id`, `content`, `message_type`) VALUES
  (2, 1002, NULL, 2001, '今天先按文档拆 MVP：账号、好友、私聊、群聊和 ACK。', 1),
  (2, 1001, NULL, 2001, 'UI 我会参考微信的三栏结构，聊天体验先做顺滑。', 1),
  (1, 1002, 1001, NULL, '林澈，先把 demo 做到能演示实时聊天就很够用了。', 1),
  (1, 1001, 1002, NULL, '收到，我会把未读、历史、图片消息也一起带上。', 1);
