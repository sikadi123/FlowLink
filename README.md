# FlowLink 即时通讯系统

FlowLink 当前已经整理为前后端分离项目：后端使用 Spring Boot + MyBatis + Netty 4.1，前端使用 Vue 3 + Pinia。项目保留本地演示模式，也保留 MySQL、Redis、MinIO 的正式架构配置。

## 快速启动

推荐使用完整一键启动。它会自动启动 MySQL、Redis、MinIO，再启动 Spring Boot 后端和 Vue 前端：

```bat
start-flowlink.cmd
```

启动后访问：

```text
前端页面: http://localhost:5173
后端 HTTP: http://localhost:8080
后端 Netty WebSocket: ws://localhost:8090/ws
```

停止前后端：

```bat
stop-flowlink.cmd
```

如果演示数据出现中文乱码，重置 FlowLink 的 Docker 数据卷并重新导入 UTF-8 种子数据：

```bat
reset-flowlink-data.cmd
```

只停止 MySQL、Redis、MinIO：

```bat
stop-infra.cmd
```

MinIO 控制台：

```text
http://localhost:9001
minioadmin / minioadmin
```

演示账号：

```text
linche / flowlink123
shenyan / flowlink123
xuzhihang / flowlink123
zhouyu / flowlink123
```

本地演示模式不需要 MySQL、Redis、MinIO，适合快速看前端和接口：

```bat
start-dev.cmd
```

如果 PowerShell 提示禁止运行 `npm.ps1`，请使用 `npm.cmd`：

```powershell
cd C:\Users\sikad\Desktop\FlowLink\frontend
npm.cmd run dev
```

## 分开启动

后端本地模式不需要安装 MySQL、Redis、MinIO，会使用 H2 内存数据库、内存状态降级和本地文件目录。

```powershell
cd C:\Users\sikad\Desktop\FlowLink\backend
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=local"
```

前端：

```powershell
cd C:\Users\sikad\Desktop\FlowLink\frontend
npm.cmd install
npm.cmd run dev
```

## 项目结构

```text
backend/                         Spring Boot 后端
  src/main/java/com/flowlink/
    controller/                  REST API 控制层
    service/                     业务服务层
    mapper/                      MyBatis Mapper/DAO
    domain/                      领域实体
    realtime/                    Netty 4.1 长连接网关
    config/                      配置、MinIO、静态文件访问
  src/main/resources/
    application.yml              正式环境配置
    application-local.yml        本地演示配置
    schema-h2.sql                H2 本地建表
    data-h2.sql                  H2 演示数据

frontend/                        Vue 3 + Pinia 前端
  src/components/                页面组件
  src/stores/                    Pinia 状态管理
  src/api/                       请求封装

database/                        MySQL 建表和迁移脚本
src/, public/, server.mjs        旧 Node demo，仅作历史参考
```

## 当前后端能力

- 登录、注册、退出登录，会话令牌由 Redis 管理，本地模式自动降级到内存。
- 用户资料修改、用户搜索。
- 好友搜索、好友申请、通过/拒绝申请、删除好友、通知。
- 群聊创建、编辑资料、邀请成员、移除成员、退出群聊、解散群聊。
- 群管理员、群主转让、单成员禁言、全员禁言。
- 私聊/群聊历史消息、发送消息、撤回消息、未读数。
- 文件上传：正式模式上传 MinIO，本地模式保存到 `backend/uploads`，数据库只保存 `file_record` 元数据和访问地址。
- Netty 4.1 WebSocket 网关：`ws://localhost:8090/ws?token=...`。

## 正式依赖

正式配置在 `backend/src/main/resources/application.yml`，默认连接 Docker Compose 启动的服务：

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3307/flowlink?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai
    username: flowlink
    password: flowlink123
  data:
    redis:
      host: localhost
      port: 6379

flowlink:
  storage:
    mode: minio
  minio:
    endpoint: http://localhost:9000
    bucket: flowlink
```

Docker Compose 会自动执行：

```text
database/schema.sql
database/seed.sql
```

也可以手动初始化 MySQL：

```powershell
mysql -u root -p < database\schema.sql
mysql -u root -p < database\seed.sql
```

基础设施停止：

```bat
stop-infra.cmd
```

如果需要删除 MySQL、Redis、MinIO 的数据卷重新初始化：

```powershell
docker compose down -v
start-infra.cmd
```

## 常见问题

Maven 参数报 `Unknown lifecycle phase ".run.profiles=local"` 时，请把 profile 参数加引号：

```powershell
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=local"
```

前端上传后文件不显示时，确认 Vite 代理包含 `/uploads`，当前 `frontend/vite.config.js` 已配置。
