package com.flowlink.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "flowlink")
public class FlowLinkProperties {
  private final Netty netty = new Netty();
  private final Session session = new Session();
  private final Minio minio = new Minio();
  private final Storage storage = new Storage();
  private final Ai ai = new Ai();

  public Netty getNetty() {
    return netty;
  }

  public Session getSession() {
    return session;
  }

  public Minio getMinio() {
    return minio;
  }

  public Storage getStorage() {
    return storage;
  }

  public Ai getAi() {
    return ai;
  }

  public static class Netty {
    private int port = 8090;
    private String path = "/ws";
    public int getPort() { return port; }
    public void setPort(int port) { this.port = port; }
    public String getPath() { return path; }
    public void setPath(String path) { this.path = path; }
  }

  public static class Session {
    private long ttlSeconds = 604800;
    public long getTtlSeconds() { return ttlSeconds; }
    public void setTtlSeconds(long ttlSeconds) { this.ttlSeconds = ttlSeconds; }
  }

  public static class Minio {
    private String endpoint;
    private String accessKey;
    private String secretKey;
    private String bucket;
    private String publicBaseUrl;
    public String getEndpoint() { return endpoint; }
    public void setEndpoint(String endpoint) { this.endpoint = endpoint; }
    public String getAccessKey() { return accessKey; }
    public void setAccessKey(String accessKey) { this.accessKey = accessKey; }
    public String getSecretKey() { return secretKey; }
    public void setSecretKey(String secretKey) { this.secretKey = secretKey; }
    public String getBucket() { return bucket; }
    public void setBucket(String bucket) { this.bucket = bucket; }
    public String getPublicBaseUrl() { return publicBaseUrl; }
    public void setPublicBaseUrl(String publicBaseUrl) { this.publicBaseUrl = publicBaseUrl; }
  }

  public static class Storage {
    private String mode = "minio";
    private String localDir = "uploads";
    private String publicPath = "/uploads";
    public String getMode() { return mode; }
    public void setMode(String mode) { this.mode = mode; }
    public String getLocalDir() { return localDir; }
    public void setLocalDir(String localDir) { this.localDir = localDir; }
    public String getPublicPath() { return publicPath; }
    public void setPublicPath(String publicPath) { this.publicPath = publicPath; }
  }

  public static class Ai {
    private boolean enabled = true;
    private long assistantUserId = 9001;
    private String baseUrl = "https://api.openai.com/v1/chat/completions";
    private String apiKey = "";
    private String model = "gpt-4o-mini";
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public long getAssistantUserId() { return assistantUserId; }
    public void setAssistantUserId(long assistantUserId) { this.assistantUserId = assistantUserId; }
    public String getBaseUrl() { return baseUrl; }
    public void setBaseUrl(String baseUrl) { this.baseUrl = baseUrl; }
    public String getApiKey() { return apiKey; }
    public void setApiKey(String apiKey) { this.apiKey = apiKey; }
    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }
  }
}
