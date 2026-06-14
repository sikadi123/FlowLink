package com.flowlink;

import com.flowlink.config.FlowLinkProperties;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@MapperScan("com.flowlink.mapper")
@EnableConfigurationProperties(FlowLinkProperties.class)
public class FlowLinkApplication {
  public static void main(String[] args) {
    SpringApplication.run(FlowLinkApplication.class, args);
  }
}
