# FlowLink AI 助手使用说明

FlowLink 已内置一个 AI 助手联系人，默认账号为：

```text
用户 ID: 9001
账号名: flowlink_ai
显示昵称: FlowLink AI 助手
```

AI 助手会默认出现在所有用户的通讯录和会话列表中。你可以像给普通好友发消息一样，直接打开“FlowLink AI 助手”并发送文本消息。

## 1. 默认演示模式

如果没有配置 AI Key，系统仍然可以使用 AI 助手。

此时后端会返回本地兜底回复，适合课堂演示、离线调试和没有外部 API Key 的情况。例如可以问：

```text
项目答辩应该怎么讲？
群聊管理员和群主有什么区别？
语音消息是怎么实现的？
```

这种模式不需要联网调用大模型，但回答内容是固定规则生成的，不是真正的大模型回答。

## 2. 接入真实 AI 模型

后端支持 OpenAI 兼容的 Chat Completions 接口。启动后端前设置环境变量即可。

PowerShell 示例：

```powershell
$env:FLOWLINK_AI_API_KEY="你的 API Key"
$env:FLOWLINK_AI_MODEL="gpt-4o-mini"
.\mvnw.cmd spring-boot:run
```

如果你使用的是其他 OpenAI 兼容服务，可以同时设置接口地址：

```powershell
$env:FLOWLINK_AI_BASE_URL="https://你的服务地址/v1/chat/completions"
$env:FLOWLINK_AI_API_KEY="你的 API Key"
$env:FLOWLINK_AI_MODEL="你的模型名"
.\mvnw.cmd spring-boot:run
```

一键启动脚本也可以使用这些环境变量。先在当前 PowerShell 窗口设置环境变量，再运行：

```powershell
.\start-flowlink.cmd
```

## 3. 配置项说明

配置位于：

```text
backend/src/main/resources/application.yml
backend/src/main/resources/application-local.yml
```

相关配置：

```yaml
flowlink:
  ai:
    enabled: true
    assistant-user-id: 9001
    base-url: ${FLOWLINK_AI_BASE_URL:https://api.openai.com/v1/chat/completions}
    api-key: ${FLOWLINK_AI_API_KEY:}
    model: ${FLOWLINK_AI_MODEL:gpt-4o-mini}
```

字段说明：

- `enabled`: 是否启用 AI 助手回复。
- `assistant-user-id`: AI 助手对应的系统用户 ID，默认是 `9001`。
- `base-url`: OpenAI 兼容 Chat Completions 接口地址。
- `api-key`: AI 服务 API Key。
- `model`: 使用的模型名称。

## 4. 数据库说明

AI 助手是真实数据库用户，不是前端假联系人。

数据库迁移文件：

```text
database/migration_003_ai_group_nickname.sql
```

该迁移会做三件事：

- 确保 `group_member.nickname_in_group` 字段存在。
- 创建或更新 `FlowLink AI 助手` 用户。
- 将 AI 助手加入所有用户的好友列表。

`start-flowlink.ps1` 已经接入该迁移。正常运行一键启动即可自动应用：

```powershell
.\start-flowlink.cmd
```

## 5. 前端使用方式

1. 登录任意账号。
2. 在左侧会话列表或通讯录中找到 `FlowLink AI 助手`。
3. 打开会话。
4. 发送文本消息。
5. AI 助手会自动回复，并且回复会保存到消息表中。

注意：当前 AI 助手只处理私聊文本消息。图片、文件、语音暂时不会触发 AI 回复。

## 6. 常见问题

### 为什么 AI 回复像固定模板？

说明没有配置 `FLOWLINK_AI_API_KEY`，系统正在使用本地兜底回复。

### 为什么通讯录里没有 AI 助手？

先重新运行一键启动脚本：

```powershell
.\start-flowlink.cmd
```

如果仍然没有，可以重置演示数据：

```powershell
.\reset-flowlink-data.cmd
```

### 配置了 Key 但还是没有真实回复？

检查三点：

- `FLOWLINK_AI_API_KEY` 是否在启动后端的同一个 PowerShell 窗口里设置。
- `FLOWLINK_AI_BASE_URL` 是否是 `/v1/chat/completions` 这种 Chat Completions 地址。
- 后端是否已经重启。

### 能不能换成别的模型？

可以。只要服务兼容 OpenAI Chat Completions 格式，修改 `FLOWLINK_AI_MODEL` 即可。
