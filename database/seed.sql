USE flowlink;

INSERT INTO `user`
  (`id`, `username`, `email`, `password_hash`, `display_name`, `bio`, `role_title`, `department`, `phone`, `location`, `status_message`, `status`)
VALUES
  (1001, 'linche', 'linche@flowlink.local', 'demo:flowlink123', '林澈', '负责微信风格 UI、个人资料页和消息交互。', '前端体验设计', '体验组', '138-0000-2601', '武汉', '正在打磨 FlowLink 的聊天体验。', 2),
  (1002, 'shenyan', 'shenyan@flowlink.local', 'demo:flowlink123', '沈砚', '负责整体通信架构和实时链路。', '通信架构师', '后端组', '138-0000-2602', '武汉', '关注长连接、ACK 与消息路由。', 2),
  (1003, 'xuzhihang', 'xuzhihang@flowlink.local', 'demo:flowlink123', '许知航', '负责实时状态管理、文件消息和消息幂等。', 'WebSocket 客户端', '前端组', '138-0000-2603', '杭州', '把消息状态机做稳。', 2),
  (1004, 'zhouyu', 'zhouyu@flowlink.local', 'demo:flowlink123', '周屿', '负责 JWT、Redis 网关、敏感词和禁言策略。', '安全与缓存', '平台组', '138-0000-2604', '南京', '先把安全边界画清楚。', 2),
  (1005, 'yelan', 'yelan@flowlink.local', 'demo:flowlink123', '叶岚', '负责 MySQL、文件记录和数据映射。', '数据负责人', '数据组', '138-0000-2605', '上海', '表结构已经就绪。', 2),
  (1006, 'songyao', 'songyao@flowlink.local', 'demo:flowlink123', '宋遥', '负责用户、好友、群组和通知业务。', '后端业务开发', '业务组', '138-0000-2606', '成都', '补齐好友和群组闭环。', 2);

INSERT INTO `friendship` (`user_id`, `friend_id`) VALUES
  (1001, 1002), (1002, 1001),
  (1001, 1003), (1003, 1001),
  (1001, 1004), (1004, 1001),
  (1002, 1003), (1003, 1002),
  (1002, 1005), (1005, 1002),
  (1004, 1006), (1006, 1004);

INSERT INTO `friend_request` (`sender_id`, `receiver_id`, `message`, `status`) VALUES
  (1005, 1001, '数据库结构已经准备好，拉我进前端联调。', 0);

INSERT INTO `chat_group` (`id`, `group_name`, `owner_id`, `notice`, `description`, `mute_all`) VALUES
  (2001, 'A2607 FlowLink 项目组', 1002, '今日重点：完善资料页、群聊管理、文件消息和禁言能力。', '课程设计项目组，集中讨论 FlowLink 的需求、架构、联调和验收。', 0),
  (2002, '前端体验联调', 1001, '重点检查消息气泡、未读、重连、输入反馈和文件卡片。', '前端 UI、WebSocket 客户端和交互体验联调小组。', 0);

INSERT INTO `group_member` (`group_id`, `user_id`, `role`, `muted`) VALUES
  (2001, 1001, 1, 0), (2001, 1002, 2, 0), (2001, 1003, 0, 0), (2001, 1004, 0, 0), (2001, 1005, 0, 0), (2001, 1006, 0, 0),
  (2002, 1001, 2, 0), (2002, 1002, 0, 0), (2002, 1003, 0, 0);

INSERT INTO `message` (`conversation_type`, `sender_id`, `receiver_id`, `group_id`, `content`, `message_type`) VALUES
  (2, 1002, NULL, 2001, '今天先按文档跑通 MVP：账号、好友、私聊、群聊和 ACK。', 1),
  (2, 1001, NULL, 2001, 'UI 我会参考微信的三栏结构，聊天体验先做顺滑。', 1),
  (2, 1003, NULL, 2001, 'WebSocket 客户端会加重连、输入中状态和文件发送。', 1),
  (1, 1002, 1001, NULL, '林澈，先把 demo 做到能演示实时聊天就很够用了。', 1),
  (1, 1001, 1002, NULL, '收到，我会把未读、历史、图片和文件消息也一起带上。', 1);
