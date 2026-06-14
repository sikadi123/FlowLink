package com.flowlink.realtime;

import com.flowlink.config.FlowLinkProperties;
import io.netty.bootstrap.ServerBootstrap;
import io.netty.channel.ChannelFuture;
import io.netty.channel.ChannelInitializer;
import io.netty.channel.ChannelOption;
import io.netty.channel.EventLoopGroup;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.SocketChannel;
import io.netty.channel.socket.nio.NioServerSocketChannel;
import io.netty.handler.codec.http.HttpObjectAggregator;
import io.netty.handler.codec.http.HttpServerCodec;
import io.netty.handler.codec.http.websocketx.WebSocketServerProtocolHandler;
import io.netty.handler.stream.ChunkedWriteHandler;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.springframework.stereotype.Component;

@Component
public class NettyGatewayServer {
  private final FlowLinkProperties properties;
  private final WebSocketAuthHandler.Factory authHandlerFactory;
  private final RealtimeFrameHandler frameHandler;
  private EventLoopGroup bossGroup;
  private EventLoopGroup workerGroup;
  private ChannelFuture serverFuture;

  public NettyGatewayServer(FlowLinkProperties properties, WebSocketAuthHandler.Factory authHandlerFactory, RealtimeFrameHandler frameHandler) {
    this.properties = properties;
    this.authHandlerFactory = authHandlerFactory;
    this.frameHandler = frameHandler;
  }

  @PostConstruct
  public void start() throws InterruptedException {
    bossGroup = new NioEventLoopGroup(1);
    workerGroup = new NioEventLoopGroup();
    ServerBootstrap bootstrap = new ServerBootstrap()
        .group(bossGroup, workerGroup)
        .channel(NioServerSocketChannel.class)
        .option(ChannelOption.SO_BACKLOG, 256)
        .childOption(ChannelOption.SO_KEEPALIVE, true)
        .childHandler(new ChannelInitializer<SocketChannel>() {
          @Override
          protected void initChannel(SocketChannel channel) {
            channel.pipeline()
                .addLast(new HttpServerCodec())
                .addLast(new ChunkedWriteHandler())
                .addLast(new HttpObjectAggregator(65536))
                .addLast(authHandlerFactory.create())
                .addLast(new WebSocketServerProtocolHandler(properties.getNetty().getPath(), null, true, 2 * 1024 * 1024))
                .addLast(frameHandler);
          }
        });
    serverFuture = bootstrap.bind(properties.getNetty().getPort()).sync();
  }

  @PreDestroy
  public void stop() {
    if (serverFuture != null) serverFuture.channel().close();
    if (bossGroup != null) bossGroup.shutdownGracefully();
    if (workerGroup != null) workerGroup.shutdownGracefully();
  }
}
