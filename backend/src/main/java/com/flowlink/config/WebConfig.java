package com.flowlink.config;

import java.nio.file.Paths;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
  private final FlowLinkProperties properties;

  public WebConfig(FlowLinkProperties properties) {
    this.properties = properties;
  }

  @Override
  public void addResourceHandlers(ResourceHandlerRegistry registry) {
    String publicPath = properties.getStorage().getPublicPath();
    String localDir = Paths.get(properties.getStorage().getLocalDir()).toAbsolutePath().normalize().toUri().toString();
    registry.addResourceHandler(publicPath + "/**")
        .addResourceLocations(localDir);
  }
}
