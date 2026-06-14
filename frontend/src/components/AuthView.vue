<script setup>
import { reactive } from "vue";
import { useChatStore } from "../stores/chatStore";

const store = useChatStore();
const loginForm = reactive({ account: "linche", password: "flowlink123" });

async function login() {
  try {
    await store.login(loginForm.account, loginForm.password);
  } catch (error) {
    store.toast(error.message || "登录失败");
  }
}
</script>

<template>
  <main class="auth-view">
    <section class="auth-panel">
      <div class="brand-row">
        <div class="brand-mark">F</div>
        <div>
          <h1>FlowLink</h1>
          <p>即时通讯协作平台</p>
        </div>
      </div>

      <form class="auth-form" @submit.prevent="login">
        <label>
          <span>账号</span>
          <input v-model="loginForm.account" placeholder="请输入账号" autocomplete="username" />
        </label>
        <label>
          <span>密码</span>
          <input v-model="loginForm.password" placeholder="请输入密码" type="password" autocomplete="current-password" />
        </label>
        <button type="submit">登录</button>
      </form>

      <div class="demo-account">
        演示账号：linche / flowlink123
      </div>
    </section>
  </main>
</template>
