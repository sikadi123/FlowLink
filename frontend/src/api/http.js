export const API_BASE = "";

export async function request(path, options = {}) {
  const token = localStorage.getItem("flowlink_token") || "";
  const isForm = options.body instanceof FormData;
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        ...(isForm ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });
  } catch (cause) {
    const error = new Error("后端服务未连接");
    error.isNetwork = true;
    error.cause = cause;
    throw error;
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
