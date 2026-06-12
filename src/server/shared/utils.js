import crypto from "node:crypto";

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function nowIso() {
  return new Date().toISOString();
}

export function id(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

export function avatar(displayName, background = "#07c160") {
  return {
    text: [...String(displayName || "F")][0] || "F",
    background,
  };
}

export function hashPassword(password, salt = crypto.randomBytes(12).toString("hex")) {
  const hash = crypto.createHash("sha256").update(`${salt}:${password}`).digest("hex");
  return { salt, hash };
}

export function verifyPassword(password, saved) {
  if (!saved?.salt || !saved?.hash) return false;
  return hashPassword(password, saved.salt).hash === saved.hash;
}

export async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ApiError(400, "请求体不是有效 JSON");
  }
}

export function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

export function ok(data = null, message = "success") {
  return { success: true, code: 0, message, data };
}

export function fail(message, code = -1) {
  return { success: false, code, message };
}

export function privateConversationId(a, b) {
  return `p:${[a, b].sort().join(":")}`;
}

export function splitPrivateConversationId(conversationId) {
  return conversationId?.startsWith("p:") ? conversationId.slice(2).split(":") : [];
}

export function clampText(value, max, fallback = "") {
  return String(value ?? fallback).trim().slice(0, max);
}
