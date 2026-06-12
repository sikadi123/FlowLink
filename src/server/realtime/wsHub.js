import crypto from "node:crypto";
import { config } from "../config.js";
import { store } from "../persistence/store.js";
import { groupService } from "../services/groupService.js";
import { getFriends } from "../services/socialService.js";
import { messageService } from "../services/messageService.js";
import { publicUser } from "../services/userService.js";

function encodeFrame(data, opcode = 0x1) {
  const payload = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const length = payload.length;
  let header;
  if (length < 126) {
    header = Buffer.alloc(2);
    header[1] = length;
  } else if (length < 65536) {
    header = Buffer.alloc(4);
    header[1] = 126;
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.alloc(10);
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(length), 2);
  }
  header[0] = 0x80 | opcode;
  return Buffer.concat([header, payload]);
}

function decodeFrames(buffer) {
  const frames = [];
  let offset = 0;
  while (offset + 2 <= buffer.length) {
    const first = buffer[offset];
    const second = buffer[offset + 1];
    const opcode = first & 0x0f;
    const masked = Boolean(second & 0x80);
    let length = second & 0x7f;
    let cursor = offset + 2;
    if (length === 126) {
      if (cursor + 2 > buffer.length) break;
      length = buffer.readUInt16BE(cursor);
      cursor += 2;
    } else if (length === 127) {
      if (cursor + 8 > buffer.length) break;
      length = Number(buffer.readBigUInt64BE(cursor));
      cursor += 8;
    }
    let mask;
    if (masked) {
      if (cursor + 4 > buffer.length) break;
      mask = buffer.subarray(cursor, cursor + 4);
      cursor += 4;
    }
    if (cursor + length > buffer.length) break;
    const payload = Buffer.from(buffer.subarray(cursor, cursor + length));
    if (masked) {
      for (let index = 0; index < payload.length; index += 1) payload[index] ^= mask[index % 4];
    }
    frames.push({ opcode, payload });
    offset = cursor + length;
  }
  return { frames, remaining: buffer.subarray(offset) };
}

export class WsHub {
  constructor() {
    this.clients = new Map();
  }

  isOnline(userId) {
    return this.clients.has(userId) && this.clients.get(userId).size > 0;
  }

  onlineCount() {
    return this.clients.size;
  }

  notifyUsers(userIds, action, payload) {
    for (const userId of new Set(userIds)) {
      const sockets = this.clients.get(userId);
      if (!sockets) continue;
      for (const client of sockets) client.send({ action, payload });
    }
  }

  broadcastPresence(userId) {
    const user = store.db.users.find((item) => item.id === userId);
    if (!user) return;
    const targetIds = new Set(getFriends(userId).map((friend) => friend.id));
    store.db.groups
      .filter((group) => group.status !== "dissolved" && group.memberIds.includes(userId))
      .forEach((group) => group.memberIds.forEach((memberId) => targetIds.add(memberId)));
    this.notifyUsers([...targetIds], "presence", { user: publicUser(user, this) });
  }

  handleUpgrade(req, socket) {
    const currentUrl = new URL(req.url, `http://${req.headers.host}`);
    if (currentUrl.pathname !== "/ws") {
      socket.destroy();
      return;
    }
    const token = currentUrl.searchParams.get("token") || "";
    const session = store.db.sessions[token];
    const user = session ? store.db.users.find((item) => item.id === session.userId) : null;
    if (!user) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }
    const acceptKey = crypto.createHash("sha1").update(`${req.headers["sec-websocket-key"]}${config.wsGuid}`).digest("base64");
    socket.write(
      "HTTP/1.1 101 Switching Protocols\r\n" +
        "Upgrade: websocket\r\n" +
        "Connection: Upgrade\r\n" +
        `Sec-WebSocket-Accept: ${acceptKey}\r\n\r\n`
    );
    const client = this.createClient(socket, user);
    if (!this.clients.has(user.id)) this.clients.set(user.id, new Set());
    this.clients.get(user.id).add(client);
    client.send({ action: "connected", payload: { user: publicUser(user, this) } });
    this.broadcastPresence(user.id);
    socket.on("close", () => this.removeClient(user.id, client));
    socket.on("end", () => this.removeClient(user.id, client));
    socket.on("error", () => this.removeClient(user.id, client));
  }

  removeClient(userId, client) {
    const sockets = this.clients.get(userId);
    if (!sockets) return;
    sockets.delete(client);
    if (sockets.size === 0) {
      this.clients.delete(userId);
      this.broadcastPresence(userId);
    }
  }

  createClient(socket, user) {
    let buffer = Buffer.alloc(0);
    const hub = this;
    const client = {
      send(payload) {
        if (!socket.destroyed) socket.write(encodeFrame(JSON.stringify(payload)));
      },
    };
    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      const result = decodeFrames(buffer);
      buffer = result.remaining;
      for (const frame of result.frames) {
        if (frame.opcode === 0x8) return socket.end();
        if (frame.opcode === 0x9) {
          socket.write(encodeFrame(frame.payload, 0xA));
          continue;
        }
        if (frame.opcode !== 0x1) continue;
        try {
          const packet = JSON.parse(frame.payload.toString("utf8"));
          hub.handlePacket(user, client, packet);
        } catch (error) {
          client.send({ action: "error", payload: { message: error.message || "消息格式错误" } });
        }
      }
    });
    return client;
  }

  handlePacket(user, client, packet) {
    const payload = packet.payload || {};
    if (packet.action === "heartbeat") {
      client.send({ action: "heartbeat_ack", payload: { at: new Date().toISOString() } });
      return;
    }
    if (packet.action === "send_message") {
      const message = messageService.create(user.id, payload, this);
      client.send({
        action: "message_ack",
        payload: {
          clientId: payload.clientId || null,
          messageId: message.id,
          status: message.deliveredTo?.length ? "delivered" : "sent",
        },
      });
      return;
    }
    if (packet.action === "typing") {
      messageService.markRead(user, payload.conversationType || "private", payload.targetId || "", this);
      const conversationId = messageService.conversationId(payload.conversationType || "private", payload.targetId || "", user.id);
      const recipients =
        payload.conversationType === "group"
          ? groupService.getGroup(payload.targetId)?.memberIds || []
          : [payload.targetId];
      this.notifyUsers(
        recipients.filter((idValue) => idValue && idValue !== user.id),
        "typing",
        {
          from: publicUser(user, this),
          conversationType: payload.conversationType,
          conversationId,
          typing: Boolean(payload.typing),
        }
      );
      return;
    }
    if (packet.action === "read_conversation") {
      messageService.markRead(user, payload.conversationType || "private", payload.targetId || "", this);
    }
  }
}
