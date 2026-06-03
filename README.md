# FlowLink

FlowLink 是一个基于设计报告搭建的在线聊天平台 demo。当前版本先做可运行的 MVP：账号登录/注册、好友申请、联系人、群聊、私聊、历史消息、WebSocket 实时推送、ACK 状态、输入中提示、未读计数、图片消息和 2 分钟内撤回。

## 运行

```bash
npm start
```

启动后访问：

```text
http://localhost:3000
```

内置演示账号：

```text
wanghui / flowlink123
guimingyang / flowlink123
xuqiantao / flowlink123
```

## 当前结构

```text
server.mjs          零依赖 Node 服务端，包含 REST API 与原生 WebSocket
public/index.html   单页聊天工作台
public/styles.css   微信风格 UI
public/app.js       前端状态、实时消息与交互逻辑
database/schema.sql MySQL 数据库建表脚本
database/seed.sql   MySQL 演示种子数据
data/               本地 JSON 数据目录，首次运行自动生成
项目需求.md          项目需求清单
```

## 后端接口

当前 demo 已打通这些接口：

```text
POST  /api/auth/login
POST  /api/auth/register
POST  /api/auth/logout
GET   /api/bootstrap
PATCH /api/me
GET   /api/users?q=
POST  /api/friends/request
POST  /api/friends/respond
POST  /api/groups
GET   /api/messages/history?type=&targetId=
POST  /api/messages/send
POST  /api/messages/:id/recall
WS    /ws?token=
```

`database/schema.sql` 对齐了你提供的数据库设计，并补充了 `message_receipt` 与 `user_session`，用于后续 ACK、已读回执和登录会话落库。

## 后续升级路线

1. 将 `server.mjs` 的 REST API 迁移到 Spring Boot 3。
2. 将当前原生 WebSocket 服务迁移到 Netty 4.1，并保留消息协议字段。
3. 用 MySQL 持久化用户、好友、群组和消息，用 Redis 管理在线状态与未读数。
4. 前端可继续演进为 Vue 3 + Pinia，复用当前页面的信息架构和交互流程。
