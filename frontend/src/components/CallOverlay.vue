<script setup>
import { computed, nextTick, ref, watch } from "vue";
import { Camera, CameraOff, Mic, MicOff, PhoneCall, PhoneOff, Video } from "@lucide/vue";

const props = defineProps({
  call: { type: Object, required: true }
});

const emit = defineEmits(["accept", "reject", "hangup", "toggleMic", "toggleCamera"]);

const localVideo = ref(null);
const remoteVideo = ref(null);

const statusText = computed(() => {
  const status = props.call.status;
  if (status === "incoming") return "邀请你进行视频通话";
  if (status === "calling") return "正在呼叫对方";
  if (status === "ringing") return "等待对方接听";
  if (status === "connecting") return "正在建立局域网连接";
  if (status === "active") return "视频通话中";
  return "视频通话";
});

const showIncomingActions = computed(() => props.call.status === "incoming" && props.call.incoming);
const showCallControls = computed(() => !showIncomingActions.value);

async function attachStream(videoRef, stream, muted = false) {
  await nextTick();
  if (!videoRef.value) return;
  if (videoRef.value.srcObject !== stream) videoRef.value.srcObject = stream || null;
  videoRef.value.muted = muted;
  if (stream) {
    try {
      await videoRef.value.play();
    } catch {
      // Browsers may wait for a user gesture before playback; the stream stays attached.
    }
  }
}

watch(
  () => props.call.localStream,
  (stream) => attachStream(localVideo, stream, true),
  { immediate: true }
);

watch(
  () => props.call.remoteStream,
  (stream) => attachStream(remoteVideo, stream, false),
  { immediate: true }
);
</script>

<template>
  <section v-if="call.visible" class="call-overlay">
    <div class="call-window">
      <header class="call-topbar">
        <div class="call-peer">
          <div class="call-avatar">{{ (call.peerName || "?").slice(0, 1) }}</div>
          <div>
            <strong>{{ call.peerName || "联系人" }}</strong>
            <span>{{ statusText }}</span>
          </div>
        </div>
        <div class="call-live-badge">
          <Video />
          LAN
        </div>
      </header>

      <div class="call-stage" :class="{ waiting: !call.remoteStream }">
        <video ref="remoteVideo" class="remote-video" autoplay playsinline></video>
        <div v-if="!call.remoteStream" class="call-placeholder">
          <Video />
          <strong>{{ showIncomingActions ? "收到视频邀请" : "等待对方视频画面" }}</strong>
          <span>{{ call.errorText || "请确保双方在同一局域网，并允许摄像头和麦克风权限。" }}</span>
        </div>
        <div class="local-preview" :class="{ disabled: call.cameraOff }">
          <video ref="localVideo" autoplay muted playsinline></video>
          <span v-if="call.cameraOff">摄像头已关闭</span>
        </div>
      </div>

      <p v-if="call.errorText" class="call-error">{{ call.errorText }}</p>

      <footer class="call-actions">
        <template v-if="showIncomingActions">
          <button class="call-btn danger" type="button" title="拒绝" @click="$emit('reject')">
            <PhoneOff />
          </button>
          <button class="call-btn accept" type="button" title="接听" @click="$emit('accept')">
            <PhoneCall />
          </button>
        </template>
        <template v-else>
          <button class="call-btn" :class="{ muted: call.muted }" type="button" :title="call.muted ? '打开麦克风' : '关闭麦克风'" @click="$emit('toggleMic')">
            <MicOff v-if="call.muted" />
            <Mic v-else />
          </button>
          <button class="call-btn" :class="{ muted: call.cameraOff }" type="button" :title="call.cameraOff ? '打开摄像头' : '关闭摄像头'" @click="$emit('toggleCamera')">
            <CameraOff v-if="call.cameraOff" />
            <Camera v-else />
          </button>
          <button class="call-btn danger wide" type="button" title="挂断" @click="$emit('hangup')">
            <PhoneOff />
          </button>
        </template>
      </footer>
    </div>
  </section>
</template>
