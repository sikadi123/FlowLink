<script setup>
import { avatarText } from "../utils/display";

defineProps({
  me: { type: Object, required: true },
  form: { type: Object, required: true }
});

defineEmits(["save"]);
</script>

<template>
  <section class="surface-page profile-page">
    <header class="page-header">
      <div class="avatar large">{{ avatarText(me) }}</div>
      <div>
        <h2>个人资料</h2>
        <p>维护昵称、部门、状态和联系方式，资料会同步到联系人卡片。</p>
      </div>
    </header>

    <form class="profile-grid" @submit.prevent="$emit('save', form)">
      <label><span>昵称</span><input v-model="form.displayName" placeholder="昵称" /></label>
      <label><span>用户名</span><input v-model="form.username" placeholder="用户名" /></label>
      <label><span>邮箱</span><input v-model="form.email" placeholder="邮箱" /></label>
      <label><span>职位</span><input v-model="form.role" placeholder="职位" /></label>
      <label><span>部门</span><input v-model="form.department" placeholder="部门" /></label>
      <label><span>电话</span><input v-model="form.phone" placeholder="电话" /></label>
      <label><span>地区</span><input v-model="form.location" placeholder="地区" /></label>
      <label><span>状态</span><input v-model="form.statusMessage" placeholder="状态" /></label>
      <label class="full"><span>简介</span><textarea v-model="form.bio" placeholder="个人简介"></textarea></label>
      <button type="submit">保存资料</button>
    </form>
  </section>
</template>
