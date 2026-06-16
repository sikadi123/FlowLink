package com.flowlink.service;

import com.flowlink.config.FlowLinkProperties;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import org.springframework.stereotype.Service;

@Service
public class AiAssistantService {
  private final FlowLinkProperties properties;
  private final HttpClient httpClient = HttpClient.newBuilder()
      .connectTimeout(Duration.ofSeconds(8))
      .build();

  public AiAssistantService(FlowLinkProperties properties) {
    this.properties = properties;
  }

  public boolean isAssistant(Long userId) {
    return userId != null && userId == properties.getAi().getAssistantUserId();
  }

  public Long assistantUserId() {
    return properties.getAi().getAssistantUserId();
  }

  public String reply(String userText) {
    String prompt = userText == null ? "" : userText.trim();
    if (prompt.isBlank()) return "你可以直接问我 FlowLink 的功能、项目答辩思路，或者让我帮你整理一段说明。";
    if (!properties.getAi().isEnabled()) return localReply(prompt);
    String apiKey = properties.getAi().getApiKey();
    if (apiKey == null || apiKey.isBlank()) return localReply(prompt);
    try {
      String body = """
          {
            "model": "%s",
            "messages": [
              {"role":"system","content":"你是 FlowLink 即时通讯系统内置的 AI 助手。回答要简洁、友好，优先帮助用户理解项目功能、聊天操作、答辩材料和开发问题。"},
              {"role":"user","content":"%s"}
            ],
            "temperature": 0.7
          }
          """.formatted(escape(properties.getAi().getModel()), escape(prompt));
      HttpRequest request = HttpRequest.newBuilder()
          .uri(URI.create(properties.getAi().getBaseUrl()))
          .timeout(Duration.ofSeconds(25))
          .header("Content-Type", "application/json")
          .header("Authorization", "Bearer " + apiKey)
          .POST(HttpRequest.BodyPublishers.ofString(body))
          .build();
      HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() < 200 || response.statusCode() >= 300) return localReply(prompt);
      String content = extractContent(response.body());
      return content.isBlank() ? localReply(prompt) : content;
    } catch (Exception ignored) {
      return localReply(prompt);
    }
  }

  private String localReply(String prompt) {
    if (prompt.contains("答辩") || prompt.contains("验收")) {
      return "可以按“项目背景、建设目标、系统架构、功能成果、重点难点、总结反思”这条线来讲。展示时建议穿插聊天页、群管理、通知中心和移动端截图。";
    }
    if (prompt.contains("群") || prompt.contains("管理员") || prompt.contains("群主")) {
      return "群聊里建议重点展示群主、管理员、普通成员的权限差异，例如公告修改、成员移除、禁言、全员禁言和群主转让。";
    }
    if (prompt.contains("语音") || prompt.contains("文件")) {
      return "语音消息可以按文件消息扩展：录音生成音频文件，上传到对象存储，再发送 messageType=4 的消息，前端用 audio 控件播放。";
    }
    return "我收到啦。你可以问我项目功能、技术架构、答辩表达，或者让我帮你把这段内容整理得更适合展示。";
  }

  private String escape(String value) {
    return value == null ? "" : value
        .replace("\\", "\\\\")
        .replace("\"", "\\\"")
        .replace("\n", "\\n")
        .replace("\r", "");
  }

  private String extractContent(String json) {
    String marker = "\"content\"";
    int key = json.indexOf(marker);
    if (key < 0) return "";
    int colon = json.indexOf(':', key + marker.length());
    int start = json.indexOf('"', colon + 1);
    if (colon < 0 || start < 0) return "";
    StringBuilder result = new StringBuilder();
    boolean escaped = false;
    for (int i = start + 1; i < json.length(); i++) {
      char ch = json.charAt(i);
      if (escaped) {
        result.append(switch (ch) {
          case 'n' -> '\n';
          case 'r' -> '\r';
          case 't' -> '\t';
          default -> ch;
        });
        escaped = false;
      } else if (ch == '\\') {
        escaped = true;
      } else if (ch == '"') {
        break;
      } else {
        result.append(ch);
      }
    }
    return result.toString().trim();
  }
}
