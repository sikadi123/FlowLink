# FlowLink 即时通讯系统

FlowLink 是一个前后端分离的即时通讯 Demo：

- 前端：Vue 3 + Pinia + Vite
- 后端：Spring Boot + MyBatis + Netty 4.1
- 数据与中间件：MySQL + Redis + MinIO

## 最简单启动

先打开 Docker Desktop，等 Docker 显示正在运行。

然后在项目根目录双击或执行：

```bat
start-flowlink.cmd
```

启动完成后访问：

```text
前端: http://localhost:5173
后端: http://localhost:8080
MinIO: http://localhost:9001
```

MinIO 账号：

```text
minioadmin / minioadmin
```

演示账号：

```text
linche / flowlink123
shenyan / flowlink123
xuzhihang / flowlink123
zhouyu / flowlink123
```

停止前后端：

```bat
stop-flowlink.cmd
```

停止 MySQL、Redis、MinIO：

```bat
stop-infra.cmd
```

重置数据库和演示数据：

```bat
reset-flowlink-data.cmd
```

## 手动启动

启动基础设施：

```bat
start-infra.cmd
```

启动后端：

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

启动前端：

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

PowerShell 如果提示 `npm.ps1` 禁止运行，请使用 `npm.cmd`。

## 项目结构

```text
backend/                 Spring Boot 后端
  src/main/java/com/flowlink/
    controller/          REST API
    service/             业务服务
    mapper/              MyBatis Mapper
    domain/              实体
    realtime/            Netty WebSocket 网关
    config/              配置

frontend/                Vue 3 前端
  src/components/        页面组件
  src/stores/            Pinia 状态
  src/api/               HTTP 请求封装
  src/utils/             显示工具函数

database/                MySQL 建表和演示数据
docker-compose.yml       MySQL、Redis、MinIO 编排
start-flowlink.cmd       一键启动
stop-flowlink.cmd        停止前后端
```

## 当前功能

- 登录、退出登录
- 私聊、群聊、实时消息
- 消息撤回、引用回复、表情、搜索高亮、加载更早消息
- 文件发送、图片预览、文件下载
- 好友申请、删除好友、拉黑
- 创建群聊、邀请成员、移除成员、退群、解散群
- 群公告、群资料、管理员、转让群主、单人禁言、全员禁言
- 通知中心
- 个人中心、头像 URL、预设头像、本地上传头像
- Redis 管理会话令牌、在线状态和未读数
- MinIO 存储上传文件

## 常见问题

如果启动提示 Docker API 无法连接，说明 Docker Desktop 没有运行。先打开 Docker Desktop，再执行：

```bat
start-flowlink.cmd
```

如果前端一直显示连接异常，先确认后端和 Netty 端口是否启动：

```text
http://localhost:8080/api/realtime/status
```

如果页面仍然是旧版本，浏览器按：

```text
Ctrl + F5
```
