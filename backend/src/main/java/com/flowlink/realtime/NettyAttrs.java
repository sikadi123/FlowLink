package com.flowlink.realtime;

import io.netty.util.AttributeKey;

public final class NettyAttrs {
  public static final AttributeKey<Long> USER_ID = AttributeKey.valueOf("flowlink_user_id");

  private NettyAttrs() {
  }
}
