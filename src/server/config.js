import path from "node:path";
import { fileURLToPath } from "node:url";

const rootFile = fileURLToPath(import.meta.url);
const serverDir = path.dirname(rootFile);
const srcDir = path.dirname(serverDir);
const rootDir = path.dirname(srcDir);

export const config = {
  port: Number(process.env.PORT || 3000),
  rootDir,
  publicDir: path.join(rootDir, "public"),
  dataDir: path.join(rootDir, "data"),
  dbFile: path.join(rootDir, "data", "flowlink-demo.json"),
  wsGuid: "258EAFA5-E914-47DA-95CA-C5AB0DC85B11",
  recallWindowMs: 2 * 60 * 1000,
};

export const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};
