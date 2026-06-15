<script setup>
import { computed, ref } from "vue";
import { BriefcaseBusiness, CheckCircle2, ImagePlus, Mail, MapPin, Phone, Sparkles, UserRound } from "@lucide/vue";
import { avatarImage, avatarStyle, avatarText } from "../utils/display";

const props = defineProps({
  me: { type: Object, required: true },
  form: { type: Object, required: true },
  uploadAvatar: { type: Function, required: true }
});

defineEmits(["save"]);
const uploadingAvatar = ref(false);
const uploadError = ref("");

const avatarPresets = [
  "linear-gradient(135deg,#07c160,#2f80ed)",
  "linear-gradient(135deg,#ff7a59,#ffbf47)",
  "linear-gradient(135deg,#7c3aed,#2f80ed)",
  "linear-gradient(135deg,#111827,#667085)",
  "linear-gradient(135deg,#ec4899,#f97316)"
];

const completion = computed(() => {
  const keys = ["displayName", "username", "email", "role", "department", "phone", "location", "statusMessage", "bio", "avatarUrl"];
  const filled = keys.filter((key) => String(props.form[key] || "").trim()).length;
  return Math.round((filled / keys.length) * 100);
});

function applyPreset(value) {
  props.form.avatarUrl = value;
}

const previewUser = computed(() => ({ ...props.me, ...props.form }));

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
</script>

<template>
  <section class="surface-page profile-page">
    <header class="page-header profile-header">
      <div class="avatar large" :style="avatarStyle(previewUser)">
        <img v-if="avatarImage(previewUser)" :src="avatarImage(previewUser)" alt="头像" />
        <span v-else>{{ avatarText(form.displayName ? form : me) }}</span>
      </div>
      <div>
        <h2>个人中心</h2>
        <p>设置头像、状态、联系方式和身份信息，资料会同步到联系人卡片。</p>
      </div>
      <button class="profile-save-top" type="button" @click="$emit('save', form)">
        <CheckCircle2 />保存资料
      </button>
    </header>

    <div class="profile-layout">
      <aside class="profile-card">
        <div class="profile-avatar-preview" :style="avatarStyle(previewUser)">
          <img v-if="avatarImage(previewUser)" :src="avatarImage(previewUser)" alt="头像预览" />
          <span v-else>{{ avatarText(form.displayName ? form : me) }}</span>
        </div>
        <h3>{{ form.displayName || me.displayName }}</h3>
        <p>{{ form.statusMessage || "设置一句状态，让联系人更快了解你。" }}</p>

        <div class="profile-completion">
          <div><span>资料完整度</span><strong>{{ completion }}%</strong></div>
          <i><b :style="{ width: `${completion}%` }"></b></i>
        </div>

        <dl class="profile-facts">
          <div><BriefcaseBusiness /><span>{{ form.role || "未填写职位" }}</span></div>
          <div><Mail /><span>{{ form.email || "未填写邮箱" }}</span></div>
          <div><Phone /><span>{{ form.phone || "未填写电话" }}</span></div>
          <div><MapPin /><span>{{ form.location || "未填写地区" }}</span></div>
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
            <div><strong>头像设置</strong><span>支持图片地址，也可以使用预设头像色板</span></div>
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
