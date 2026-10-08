import type { FastifyReply, FastifyRequest } from "fastify";
import { verifyAccessToken } from "../services/auth.js";

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
