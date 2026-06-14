INSERT INTO `user`
  (id, username, email, password_hash, display_name, bio, role_title, department, phone, location, status_message, status)
VALUES
  (1001, 'linche', 'linche@flowlink.local', 'demo:flowlink123', '林澈', '负责 FlowLink 前端体验与交互。', '前端体验设计', '体验组', '138-0000-2601', '武汉', '正在打磨新版聊天台。', 2),
  (1002, 'shenyan', 'shenyan@flowlink.local', 'demo:flowlink123', '沈砚', '负责后端架构与实时链路。', '通信架构师', '后端组', '138-0000-2602', '武汉', '关注长连接、ACK 与消息路由。', 2),
  (1003, 'xuzhihang', 'xuzhihang@flowlink.local', 'demo:flowlink123', '许知航', '负责 WebSocket 客户端与文件消息。', 'WebSocket 客户端', '前端组', '138-0000-2603', '杭州', '把消息状态机做稳。', 2),
  (1004, 'zhouyu', 'zhouyu@flowlink.local', 'demo:flowlink123', '周屿', '负责安全、缓存和禁言策略。', '安全与缓存', '平台组', '138-0000-2604', '南京', '先把安全边界画清楚。', 2);

INSERT INTO friendship (user_id, friend_id) VALUES
  (1001, 1002), (1002, 1001),
  (1001, 1003), (1003, 1001),
  (1001, 1004), (1004, 1001),
  (1002, 1003), (1003, 1002);

INSERT INTO chat_group (id, group_name, owner_id, notice, description, mute_all, status) VALUES
  (2001, 'A2607 FlowLink 项目组', 1002, '今日重点：完善 Vue 前端、Spring Boot 后端和禁言能力。', '课程设计项目组，集中讨论 FlowLink 的需求、架构、联调和验收。', 0, 1),
  (2002, '前端体验联调', 1001, '检查消息气泡、未读、搜索、文件和详情栏。', '前端 UI 与交互体验联调小组。', 0, 1);

INSERT INTO group_member (group_id, user_id, role, muted, status) VALUES
  (2001, 1001, 1, 0, 1),
  (2001, 1002, 2, 0, 1),
  (2001, 1003, 0, 0, 1),
  (2001, 1004, 0, 0, 1),
  (2002, 1001, 2, 0, 1),
  (2002, 1002, 0, 0, 1),
  (2002, 1003, 0, 0, 1);

INSERT INTO message (conversation_type, sender_id, receiver_id, group_id, content, message_type) VALUES
  (2, 1002, NULL, 2001, '今天先把新版前后端跑通，之后再补完整群管理流程。', 1),
  (2, 1001, NULL, 2001, '我会继续优化左侧栏、聊天详情和文件消息体验。', 1),
  (1, 1002, 1001, NULL, '新版前端跑起来以后，后端 local 模式也要能一键启动。', 1);
