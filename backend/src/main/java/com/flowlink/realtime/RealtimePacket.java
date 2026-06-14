package com.flowlink.realtime;

import java.util.Map;

public record RealtimePacket(String action, Map<String, Object> payload) {
}
