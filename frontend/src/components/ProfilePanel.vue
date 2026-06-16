<script setup>
import { computed, ref, watch } from "vue";
import { BriefcaseBusiness, CheckCircle2, ImagePlus, LogOut, Mail, MapPin, Palette, Phone, Sparkles, UserRound, Wallpaper } from "@lucide/vue";
import { avatarImage, avatarStyle, avatarText } from "../utils/display";

const props = defineProps({
  me: { type: Object, required: true },
  form: { type: Object, required: true },
  uploadAvatar: { type: Function, required: true },
  theme: { type: String, default: "wechat" },
  chatBackground: { type: String, default: "soft" },
  chatWallpaperUrl: { type: String, default: "" },
  uploadChatBackground: { type: Function, required: true }
});

const emit = defineEmits(["save", "change-theme", "change-chat-background", "change-chat-wallpaper", "logout"]);

const uploadingAvatar = ref(false);
const uploadError = ref("");
const uploadingBackground = ref(false);
const backgroundError = ref("");
const wallpaperDraft = ref(props.chatWallpaperUrl || "");

watch(
  () => props.chatWallpaperUrl,
  (value) => {
    wallpaperDraft.value = value || "";
  }
);

const avatarPresets = [
  "linear-gradient(135deg,#07c160,#2f80ed)",
  "linear-gradient(135deg,#ff7a59,#ffbf47)",
  "linear-gradient(135deg,#7c3aed,#2f80ed)",
  "linear-gradient(135deg,#111827,#667085)",
  "linear-gradient(135deg,#ec4899,#f97316)"
];

const themes = [
  { key: "wechat", name: "微信绿", color: "#07c160" },
  { key: "ocean", name: "海盐蓝", color: "#2f80ed" },
  { key: "grape", name: "葡萄紫", color: "#7c3aed" },
  { key: "sunset", name: "日落橙", color: "#f97316" }
];

const chatBackgrounds = [
  { key: "soft", name: "柔和浅色", preview: "linear-gradient(135deg,#f4f8fb,#eef3f7)" },
  { key: "paper", name: "纸感纹理", preview: "repeating-linear-gradient(45deg,#f8fafc,#f8fafc 12px,#edf2f7 12px,#edf2f7 13px)" },
  { key: "mint", name: "薄荷气泡", preview: "radial-gradient(circle at 20% 20%,rgba(7,193,96,.18),transparent 30%),linear-gradient(135deg,#f4fbf7,#edf6ff)" },
  { key: "night", name: "深色夜间", preview: "linear-gradient(135deg,#17202b,#263241)" },
  { key: "custom", name: "自定义图片", preview: "linear-gradient(135deg,#111827,#667085)" }
];

const completion = computed(() => {
  const keys = ["displayName", "username", "email", "role", "department", "phone", "location", "statusMessage", "bio", "avatarUrl"];
  const filled = keys.filter((key) => String(props.form[key] || "").trim()).length;
  return Math.round((filled / keys.length) * 100);
});

const previewUser = computed(() => ({ ...props.me, ...props.form }));

function applyPreset(value) {
  props.form.avatarUrl = value;
}

async function chooseAvatar(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  uploadError.value = "";
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    uploadError.value = "请选择图片文件";
    return;
  }
  uploadingAvatar.value = true;
  try {
    props.form.avatarUrl = await props.uploadAvatar(file);
  } catch (error) {
    uploadError.value = error.message || "头像上传失败";
  } finally {
    uploadingAvatar.value = false;
  }
}

async function chooseBackground(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  backgroundError.value = "";
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    backgroundError.value = "请选择图片文件";
    return;
  }
  uploadingBackground.value = true;
  try {
    wallpaperDraft.value = await props.uploadChatBackground(file);
  } catch (error) {
    backgroundError.value = error.message || "背景上传失败";
  } finally {
    uploadingBackground.value = false;
  }
}

function applyWallpaperUrl() {
  emit("change-chat-wallpaper", wallpaperDraft.value.trim());
  emit("change-chat-background", wallpaperDraft.value.trim() ? "custom" : "soft");
}
</script>

<template>
  <section class="surface-page profile-page">
    <header class="page-header profile-header">
      <div class="avatar large" :style="avatarStyle(previewUser)">
        <img v-if="avatarImage(previewUser)" :src="avatarImage(previewUser)" alt="头像" />
        <span v-else>{{ avatarText(previewUser) }}</span>
      </div>
      <div>
        <h2>个人中心</h2>
        <p>管理头像、昵称、联系方式、界面主题和聊天背景。</p>
      </div>
      <button class="profile-save-top" type="button" @click="$emit('save', form)">
        <CheckCircle2 />保存资料
      </button>
      <button class="profile-logout-top" type="button" @click="$emit('logout')">
        <LogOut />退出登录
      </button>
    </header>

    <div class="profile-layout">
      <aside class="profile-card">
        <div class="profile-avatar-preview" :style="avatarStyle(previewUser)">
          <img v-if="avatarImage(previewUser)" :src="avatarImage(previewUser)" alt="头像预览" />
          <span v-else>{{ avatarText(previewUser) }}</span>
        </div>
        <h3>{{ previewUser.displayName || previewUser.username }}</h3>
        <p>{{ previewUser.statusMessage || "设置一句状态，让联系人更快了解你。" }}</p>

        <div class="profile-completion">
          <div><span>资料完整度</span><strong>{{ completion }}%</strong></div>
          <i><b :style="{ width: `${completion}%` }"></b></i>
        </div>

        <dl class="profile-facts">
          <div><BriefcaseBusiness /><span>{{ previewUser.role || "未填写职位" }}</span></div>
          <div><Mail /><span>{{ previewUser.email || "未填写邮箱" }}</span></div>
          <div><Phone /><span>{{ previewUser.phone || "未填写电话" }}</span></div>
          <div><MapPin /><span>{{ previewUser.location || "未填写地区" }}</span></div>
        </dl>
      </aside>

      <form class="profile-editor" @submit.prevent="$emit('save', form)">
        <section class="profile-section">
          <div class="profile-section-title">
            <UserRound />
            <div><strong>基础信息</strong><span>用于账号识别和联系人展示</span></div>
          </div>
          <div class="profile-fields">
            <label><span>昵称</span><input v-model="form.displayName" placeholder="昵称" /></label>
            <label><span>用户名</span><input v-model="form.username" placeholder="用户名" /></label>
            <label><span>邮箱</span><input v-model="form.email" placeholder="邮箱" /></label>
            <label><span>状态签名</span><input v-model="form.statusMessage" placeholder="今天的工作状态" /></label>
          </div>
        </section>

        <section class="profile-section">
          <div class="profile-section-title">
            <ImagePlus />
            <div><strong>头像设置</strong><span>支持本地上传、图片地址和预设色块</span></div>
          </div>
          <label class="avatar-url-field">
            <span>头像地址</span>
            <input v-model="form.avatarUrl" placeholder="https://... 或选择下方预设" />
          </label>
          <div class="avatar-upload-row">
            <label class="avatar-upload-btn">
              <ImagePlus />
              <span>{{ uploadingAvatar ? "上传中..." : "本地上传头像" }}</span>
              <input hidden accept="image/*" type="file" :disabled="uploadingAvatar" @change="chooseAvatar" />
            </label>
            <small v-if="uploadError">{{ uploadError }}</small>
            <small v-else>上传后会自动填入头像地址，记得保存资料。</small>
          </div>
          <div class="avatar-presets">
            <button
              v-for="preset in avatarPresets"
              :key="preset"
              type="button"
              :style="{ background: preset }"
              :class="{ active: form.avatarUrl === preset }"
              @click="applyPreset(preset)"
            ></button>
          </div>
        </section>

        <section class="profile-section">
          <div class="profile-section-title">
            <Palette />
            <div><strong>界面主题</strong><span>调整主色调，立即应用到侧栏、按钮和强调状态</span></div>
          </div>
          <div class="theme-picker">
            <button
              v-for="item in themes"
              :key="item.key"
              type="button"
              :class="{ active: theme === item.key }"
              @click="$emit('change-theme', item.key)"
            >
              <i :style="{ background: item.color }"></i>
              <span>{{ item.name }}</span>
            </button>
          </div>
        </section>

        <section class="profile-section">
          <div class="profile-section-title">
            <Wallpaper />
            <div><strong>聊天背景</strong><span>选择预设背景，或上传图片作为聊天窗口壁纸</span></div>
          </div>
          <div class="background-picker">
            <button
              v-for="item in chatBackgrounds"
              :key="item.key"
              type="button"
              :class="{ active: chatBackground === item.key }"
              @click="$emit('change-chat-background', item.key)"
            >
              <i :style="{ background: item.preview }"></i>
              <span>{{ item.name }}</span>
            </button>
          </div>
          <div class="wallpaper-row">
            <input v-model="wallpaperDraft" placeholder="图片地址，例如 https://... 或 /files/xxx.png" />
            <button class="panel-secondary" type="button" @click="applyWallpaperUrl">应用图片</button>
          </div>
          <div class="avatar-upload-row">
            <label class="avatar-upload-btn">
              <ImagePlus />
              <span>{{ uploadingBackground ? "上传中..." : "本地上传背景" }}</span>
              <input hidden accept="image/*" type="file" :disabled="uploadingBackground" @change="chooseBackground" />
            </label>
            <small v-if="backgroundError">{{ backgroundError }}</small>
            <small v-else>聊天背景只保存在当前设备，适合做个性化展示。</small>
          </div>
        </section>

        <section class="profile-section">
          <div class="profile-section-title">
            <BriefcaseBusiness />
            <div><strong>工作信息</strong><span>让群成员和联系人更容易识别你</span></div>
          </div>
          <div class="profile-fields">
            <label><span>职位</span><input v-model="form.role" placeholder="职位" /></label>
            <label><span>部门</span><input v-model="form.department" placeholder="部门" /></label>
            <label><span>电话</span><input v-model="form.phone" placeholder="电话" /></label>
            <label><span>地区</span><input v-model="form.location" placeholder="地区" /></label>
          </div>
        </section>

        <section class="profile-section">
          <div class="profile-section-title">
            <Sparkles />
            <div><strong>个人简介</strong><span>展示你的负责范围、偏好和协作方式</span></div>
          </div>
          <textarea v-model="form.bio" placeholder="写一点关于你自己的介绍"></textarea>
        </section>

        <button class="profile-submit" type="submit">保存资料</button>
      </form>
    </div>
  </section>
</template>
