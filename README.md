# FlowLink

FlowLink 是一个基于需求文档和软件设计方案搭建的即时通讯系统 demo。当前版本聚焦“可演示、可扩展、结构清晰”：前端是微信风格聊天工作台，后端按接口层、业务层、持久层、实时通信层拆分。

## 运行

PowerShell 如果禁止 `npm.ps1`，可以直接用 Node 启动：

```powershell
node server.mjs
```

也可以使用：

```powershell
npm.cmd start
```

启动后访问：

```text
http://localhost:3000
```

演示账号：

```text
linche / flowlink123
shenyan / flowlink123
xuzhihang / flowlink123
```

## 当前能力

- 登录、注册、好友搜索、好友申请与审批
- 私聊、群聊、历史消息、未读计数、ACK、已读回执、输入中提示
- 文本、图片、文件消息，文件消息以卡片形式展示并支持下载
- 2 分钟内消息撤回
- 完整个人资料编辑：昵称、用户名、邮箱、职责、部门、电话、地区、状态、简介、头像色
- 群聊管理：创建群聊、编辑群名/公告/介绍、免打扰、邀请成员、移除成员、退出群聊、群主解散群聊
- 群禁言：支持全员禁言，也支持管理员对单个成员禁言/解除禁言
- 本地 JSON 持久化，并提供 MySQL 版 `database/schema.sql` 与 `database/seed.sql`

## 后端结构

```text
server.mjs                         启动入口
src/server/app.js                  HTTP Server 与静态资源
src/server/controllers/            REST API 表现层
src/server/realtime/               WebSocket 长连接与事件推送
src/server/services/               用户、好友、群组、消息业务层
src/server/persistence/store.js    本地 JSON 持久层，后续可替换 MySQL/Redis
src/server/domain/seed.js          演示种子数据
src/server/shared/                 通用工具、错误和响应结构
public/                            前端单页聊天工作台
database/schema.sql                MySQL 建表脚本
database/seed.sql                  MySQL 演示种子数据
```

## 接口概览

```text
POST   /api/auth/login
POST   /api/auth/register
POST   /api/auth/logout
GET    /api/bootstrap
PATCH  /api/me
GET    /api/users?q=
POST   /api/friends/request
POST   /api/friends/respond
POST   /api/groups
PATCH  /api/groups/:id
DELETE /api/groups/:id
POST   /api/groups/:id/members
DELETE /api/groups/:id/members/:userId
POST   /api/groups/:id/mutes
POST   /api/groups/:id/leave
GET    /api/messages/history?type=&targetId=
POST   /api/messages/send
POST   /api/messages/:id/recall
WS     /ws?token=
```

文件消息仍走 `/api/messages/send` 或 WebSocket `send_message`，`messageType` 传 `file`，并附带 `fileName`、`fileSize`、`fileType`。演示版单文件限制为 `2MB`。

## 后续升级路线

1. 将 `src/server/services` 对应迁移为 Spring Boot Service。
2. 将 `src/server/realtime` 的原生 WebSocket 替换为 Netty 4.1 长连接网关。
3. 将 `store.js` 替换为 MySQL Mapper/DAO，并用 Redis 管理在线状态、未读数和会话令牌。
4. 将文件内容从 demo dataURL 迁移到 MinIO/对象存储，只在消息表和 `file_record` 中保存元数据与访问地址。
5. 将前端继续演进为 Vue 3 + Pinia，复用当前页面结构和交互流程。
