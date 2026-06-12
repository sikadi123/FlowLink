import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { config, mimeTypes } from "./config.js";
import { createApiController } from "./controllers/apiController.js";
import { WsHub } from "./realtime/wsHub.js";

function serveStatic(req, res, pathname) {
  const requested = pathname === "/" ? "/index.html" : decodeURIComponent(pathname);
  const filePath = path.normalize(path.join(config.publicDir, requested));
  if (!filePath.startsWith(config.publicDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream" });
    res.end(data);
  });
}

export function createFlowLinkServer() {
  const hub = new WsHub();
  const handleApi = createApiController(hub);
  const server = http.createServer((req, res) => {
    const currentUrl = new URL(req.url, `http://${req.headers.host}`);
    if (currentUrl.pathname.startsWith("/api/")) {
      handleApi(req, res, currentUrl.pathname, currentUrl.searchParams);
      return;
    }
    serveStatic(req, res, currentUrl.pathname);
  });
  server.on("upgrade", (req, socket) => hub.handleUpgrade(req, socket));
  return server;
}
