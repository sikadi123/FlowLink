const SERVER_BASE_KEY = "flowlink_server_base";
const REQUEST_TIMEOUT_MS = 10000;

export function normalizeServerBase(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

export function getServerBase() {
  return normalizeServerBase(localStorage.getItem(SERVER_BASE_KEY) || import.meta.env.VITE_API_BASE || "");
}

export function setServerBase(value) {
  const normalized = normalizeServerBase(value);
  if (normalized) localStorage.setItem(SERVER_BASE_KEY, normalized);
  else localStorage.removeItem(SERVER_BASE_KEY);
  return normalized;
}

export function resolveUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const base = getServerBase();
  return base ? `${base}${path.startsWith("/") ? path : `/${path}`}` : path;
}

export function getRealtimeBase() {
  const configured = normalizeServerBase(localStorage.getItem(SERVER_BASE_KEY) || import.meta.env.VITE_WS_BASE || import.meta.env.VITE_API_BASE || "");
  if (configured) {
    try {
      const url = new URL(configured);
      if (url.port === "8080") url.port = "8090";
      return url.toString().replace(/\/$/, "").replace(/^http:/i, "ws:").replace(/^https:/i, "wss:");
    } catch {
      return configured.replace(/^http:/i, "ws:").replace(/^https:/i, "wss:");
    }
  }
  const protocol = location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${location.hostname}:8090`;
}

export async function request(path, options = {}) {
  const token = localStorage.getItem("flowlink_token") || "";
  const isForm = options.body instanceof FormData;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), options.timeout || REQUEST_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(resolveUrl(path), {
      ...options,
      signal: controller.signal,
      headers: {
        ...(isForm ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });
  } catch (cause) {
    const error = new Error(cause?.name === "AbortError" ? "连接超时，请检查服务器地址" : "后端服务未连接");
    error.isNetwork = true;
    error.cause = cause;
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    const error = new Error(payload.message || "请求失败");
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload.data;
}
