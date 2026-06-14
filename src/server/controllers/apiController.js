import { buildBootstrap } from "../services/bootstrapService.js";
import { groupService } from "../services/groupService.js";
import { messageService } from "../services/messageService.js";
import { socialService } from "../services/socialService.js";
import { publicUser, requireAuth, userService } from "../services/userService.js";
import { ApiError, fail, ok, readJson, sendJson } from "../shared/utils.js";

export function createApiController(hub) {
  return async function handleApi(req, res, pathname, searchParams) {
    try {
      if (req.method === "POST" && pathname === "/api/auth/login") {
        return sendJson(res, 200, ok(userService.login(await readJson(req), hub)));
      }
      if (req.method === "POST" && pathname === "/api/auth/register") {
        return sendJson(res, 201, ok({ user: userService.register(await readJson(req)) }));
      }

      const { token, user } = requireAuth(req);

      if (req.method === "POST" && pathname === "/api/auth/logout") {
        userService.logout(token);
        return sendJson(res, 200, ok(true));
      }
      if (req.method === "GET" && pathname === "/api/bootstrap") {
        return sendJson(res, 200, ok(buildBootstrap(user, hub)));
      }
      if (req.method === "PATCH" && pathname === "/api/me") {
        const updated = userService.updateProfile(user, await readJson(req));
        hub.broadcastPresence(user.id);
        return sendJson(res, 200, ok(publicUser({ ...user, ...updated }, hub)));
      }
      if (req.method === "GET" && pathname === "/api/users") {
        return sendJson(res, 200, ok(socialService.searchUsers(user, searchParams.get("q"), hub)));
      }
      if (req.method === "POST" && pathname === "/api/friends/request") {
        return sendJson(res, 201, ok(socialService.sendFriendRequest(user, await readJson(req), hub)));
      }
      if (req.method === "POST" && pathname === "/api/friends/respond") {
        return sendJson(res, 200, ok(socialService.respondFriendRequest(user, await readJson(req), hub)));
      }
      if (req.method === "POST" && pathname === "/api/groups") {
        return sendJson(res, 201, ok(groupService.create(user, await readJson(req), hub)));
      }

      const groupMatch = pathname.match(/^\/api\/groups\/([^/]+)$/);
      if (groupMatch && req.method === "PATCH") {
        return sendJson(res, 200, ok(groupService.update(user, groupMatch[1], await readJson(req), hub)));
      }
      if (groupMatch && req.method === "DELETE") {
        return sendJson(res, 200, ok(groupService.dissolve(user, groupMatch[1], hub)));
      }

      const groupMembersMatch = pathname.match(/^\/api\/groups\/([^/]+)\/members$/);
      if (groupMembersMatch && req.method === "POST") {
        return sendJson(res, 200, ok(groupService.invite(user, groupMembersMatch[1], await readJson(req), hub)));
      }

      const groupMuteMatch = pathname.match(/^\/api\/groups\/([^/]+)\/mutes$/);
      if (groupMuteMatch && req.method === "POST") {
        return sendJson(res, 200, ok(groupService.setMemberMute(user, groupMuteMatch[1], await readJson(req), hub)));
      }

      const groupAdminMatch = pathname.match(/^\/api\/groups\/([^/]+)\/admins$/);
      if (groupAdminMatch && req.method === "POST") {
        return sendJson(res, 200, ok(groupService.setAdmin(user, groupAdminMatch[1], await readJson(req), hub)));
      }

      const groupOwnerMatch = pathname.match(/^\/api\/groups\/([^/]+)\/owner$/);
      if (groupOwnerMatch && req.method === "POST") {
        return sendJson(res, 200, ok(groupService.transferOwner(user, groupOwnerMatch[1], await readJson(req), hub)));
      }

      const removeMemberMatch = pathname.match(/^\/api\/groups\/([^/]+)\/members\/([^/]+)$/);
      if (removeMemberMatch && req.method === "DELETE") {
        return sendJson(res, 200, ok(groupService.removeMember(user, removeMemberMatch[1], removeMemberMatch[2], hub)));
      }

      const leaveMatch = pathname.match(/^\/api\/groups\/([^/]+)\/leave$/);
      if (leaveMatch && req.method === "POST") {
        return sendJson(res, 200, ok(groupService.leave(user, leaveMatch[1], hub)));
      }

      if (req.method === "GET" && pathname === "/api/messages/history") {
        return sendJson(
          res,
          200,
          ok(messageService.markRead(user, searchParams.get("type") || "private", searchParams.get("targetId") || "", hub))
        );
      }
      if (req.method === "POST" && pathname === "/api/messages/send") {
        return sendJson(res, 201, ok(messageService.create(user.id, await readJson(req), hub)));
      }
      const recallMatch = pathname.match(/^\/api\/messages\/([^/]+)\/recall$/);
      if (recallMatch && req.method === "POST") {
        return sendJson(res, 200, ok(messageService.recall(user, recallMatch[1], hub)));
      }

      throw new ApiError(404, "接口不存在");
    } catch (error) {
      const status = error instanceof ApiError ? error.status : 500;
      sendJson(res, status, fail(error.message || "服务器错误", status));
    }
  };
}
