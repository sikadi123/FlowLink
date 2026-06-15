<script setup>
import { computed, reactive, ref } from "vue";
import { useChatStore } from "../stores/chatStore";

const store = useChatStore();
const mode = ref("login");
const submitting = ref(false);

const loginForm = reactive({
  account: "linche",
  password: "flowlink123"
});

const registerForm = reactive({
  username: "",
  displayName: "",
  email: "",
  password: "",
  confirmPassword: ""
});

const isLogin = computed(() => mode.value === "login");

function switchMode(nextMode) {
  mode.value = nextMode;
}

async function login() {
  if (submitting.value) return;
  submitting.value = true;
  try {
    await store.login(loginForm.account, loginForm.password);
  } catch (error) {
    store.toast(error.message || "登录失败");
  } finally {
    submitting.value = false;
  }
}

async function register() {
  if (submitting.value) return;
  if (!registerForm.username.trim()) {
    store.toast("请输入账号");
    return;
  }
  if (registerForm.password.length < 6) {
    store.toast("密码至少需要 6 位");
    return;
  }
  if (registerForm.password !== registerForm.confirmPassword) {
    store.toast("两次输入的密码不一致");
    return;
  }

  submitting.value = true;
  try {
    await store.register({
      username: registerForm.username,
      displayName: registerForm.displayName,
      email: registerForm.email,
      password: registerForm.password
    });
  } catch (error) {
    store.toast(error.message || "注册失败");
  } finally {
    submitting.value = false;
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

      <div class="auth-tabs" role="tablist" aria-label="账号入口">
        <button
          type="button"
          :class="{ active: isLogin }"
          @click="switchMode('login')"
        >
          登录
        </button>
        <button
          type="button"
          :class="{ active: !isLogin }"
          @click="switchMode('register')"
        >
          注册
        </button>
      </div>

      <form v-if="isLogin" class="auth-form" @submit.prevent="login">
        <label>
          <span>账号 / 邮箱</span>
          <input v-model.trim="loginForm.account" placeholder="请输入账号或邮箱" autocomplete="username" />
        </label>
        <label>
          <span>密码</span>
          <input v-model="loginForm.password" placeholder="请输入密码" type="password" autocomplete="current-password" />
        </label>
        <button type="submit" :disabled="submitting">{{ submitting ? "登录中..." : "登录" }}</button>
      </form>

      <form v-else class="auth-form" @submit.prevent="register">
        <label>
          <span>账号</span>
          <input v-model.trim="registerForm.username" placeholder="设置登录账号" autocomplete="username" />
        </label>
        <label>
          <span>昵称</span>
          <input v-model.trim="registerForm.displayName" placeholder="你的显示名称，可稍后修改" autocomplete="nickname" />
        </label>
        <label>
          <span>邮箱</span>
          <input v-model.trim="registerForm.email" placeholder="可选，用于邮箱登录" type="email" autocomplete="email" />
        </label>
        <label>
          <span>密码</span>
          <input v-model="registerForm.password" placeholder="至少 6 位" type="password" autocomplete="new-password" />
        </label>
        <label>
          <span>确认密码</span>
          <input v-model="registerForm.confirmPassword" placeholder="再次输入密码" type="password" autocomplete="new-password" />
        </label>
        <button type="submit" :disabled="submitting">{{ submitting ? "注册中..." : "创建账号" }}</button>
      </form>

      <div class="demo-account">
        演示账号：linche / flowlink123。也可以直接注册新账号体验。
      </div>
    </section>
  </main>
</template>
