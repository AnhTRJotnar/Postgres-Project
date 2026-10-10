import type { FastifyReply, FastifyRequest } from "fastify";
import { verifyAccessToken } from "../services/auth.js";

declare module "fastify" {
    interface FastifyRequest {
        // The logged-in user, set by requireUser. Empty outside protected routes,
        // which matches no rows, so a route that forgets the check returns nothing instead of everything.
        userId: string;
    }
}

// Returns the logged-in user's id from "Authorization: Bearer <access token>", or null.
export async function authenticate(request: FastifyRequest): Promise<string | null> {
    const match = /^Bearer (\S+)$/.exec(request.headers.authorization ?? "");
    const token = match?.[1];
    return token ? verifyAccessToken(token) : null;
}

// Same answer for a missing, malformed, expired or forged token, so it gives nothing away.
export function sendUnauthorized(reply: FastifyReply) {
    return reply.status(401).header("WWW-Authenticate", "Bearer").send({ error: "Unauthorized" });
}

// onRequest hook for every protected route. Runs before the body is read,
// so requests without a valid token are turned away as early as possible.
export async function requireUser(request: FastifyRequest, reply: FastifyReply) {
    const userId = await authenticate(request);
    if (!userId) {
        return sendUnauthorized(reply);
    }
    request.userId = userId;
}
