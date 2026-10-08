import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
    getUserById,
    loginWithPassword,
    refreshSession,
    registerUser,
    revokeRefreshToken,
} from "../services/auth.js";
import { authenticate, sendUnauthorized } from "./requireAuth.js";
import { toIssues } from "./validation.js";

// Lowercased so "Anh@x.com" and "anh@x.com" are the same account.
const emailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email());

const registerBodySchema = z.strictObject({
    email: emailSchema,
    // NIST SP 800-63B rev. 4: at least 15 characters when the password is the only login factor.
    // No rules like "must contain a symbol"; any character is allowed.
    password: z.string().min(15).max(128),
});

// Login doesn't check the password rules, so a future rule change can't lock out existing users.
const loginBodySchema = z.strictObject({
    email: emailSchema,
    password: z.string().min(1).max(128),
});

const refreshBodySchema = z.strictObject({
    refreshToken: z.string().min(1).max(100),
});

// Used only to group login attempts by email for the rate limit; the route validates the body itself.
const loginKeySchema = z.object({ email: z.string() });

function loginEmailKey(request: FastifyRequest): string {
    const parsed = loginKeySchema.safeParse(request.body);
    return parsed.success ? `email:${parsed.data.email.trim().toLowerCase()}` : `ip:${request.ip}`;
}

export const authRoutes: FastifyPluginAsync = async (app) => {
    // Tokens must never be stored by a browser or proxy cache.
    app.addHook("onSend", async (_request, reply) => {
        reply.header("Cache-Control", "no-store");
    });

    type Limit = ReturnType<typeof app.createRateLimit>;

    // Runs every limit in order and answers 429 at the first one that is used up.
    // (app.rateLimit() can't be used here: it runs only one limit per request and skips the rest.)
    function limitedBy(...limits: Limit[]) {
        return async (request: FastifyRequest, reply: FastifyReply) => {
            for (const limit of limits) {
                const result = await limit(request);
                if (!result.isAllowed && result.isExceeded) {
                    return reply
                        .status(429)
                        .header("Retry-After", result.ttlInSeconds)
                        .send({ error: "Too many requests, try again later" });
                }
            }
        };
    }

    // Per IP, against bulk sign-ups.
    const registerLimit = limitedBy(app.createRateLimit({ max: 10, timeWindow: "1 hour" }));
    const loginLimit = limitedBy(
        // Per IP, against guessing many accounts from one address.
        app.createRateLimit({ max: 10, timeWindow: "1 minute" }),
        // Per email, against guessing one account's password from many addresses.
        app.createRateLimit({ max: 5, timeWindow: "15 minutes", keyGenerator: loginEmailKey }),
    );
    const tokenLimit = limitedBy(app.createRateLimit({ max: 30, timeWindow: "1 minute" }));

    app.post("/auth/register", { preHandler: registerLimit }, async (request, reply) => {
        const body = registerBodySchema.safeParse(request.body);
        if (!body.success) {
            return reply.status(400).send({ error: "Invalid registration", issues: toIssues(body.error) });
        }

        const session = await registerUser(body.data.email, body.data.password);
        if (!session) {
            return reply.status(409).send({ error: "Email already registered" });
        }

        return reply.status(201).send(session);
    });

    app.post("/auth/login", { preHandler: loginLimit }, async (request, reply) => {
        const body = loginBodySchema.safeParse(request.body);
        if (!body.success) {
            return reply.status(400).send({ error: "Invalid login", issues: toIssues(body.error) });
        }

        const session = await loginWithPassword(body.data.email, body.data.password);
        if (!session) {
            // Same message for an unknown email and a wrong password.
            return reply.status(401).send({ error: "Invalid email or password" });
        }

        return session;
    });

    app.post("/auth/refresh", { preHandler: tokenLimit }, async (request, reply) => {
        const body = refreshBodySchema.safeParse(request.body);
        if (!body.success) {
            return reply.status(400).send({ error: "Invalid refresh request", issues: toIssues(body.error) });
        }

        const session = await refreshSession(body.data.refreshToken);
        if (!session) {
            return reply.status(401).send({ error: "Invalid refresh token" });
        }

        return session;
    });

    // Always 204, so it doesn't reveal whether a token was valid.
    app.post("/auth/logout", { preHandler: tokenLimit }, async (request, reply) => {
        const body = refreshBodySchema.safeParse(request.body);
        if (!body.success) {
            return reply.status(400).send({ error: "Invalid logout request", issues: toIssues(body.error) });
        }

        await revokeRefreshToken(body.data.refreshToken);
        return reply.status(204).send();
    });

    app.get("/me", async (request, reply) => {
        const userId = await authenticate(request);
        if (!userId) {
            return sendUnauthorized(reply);
        }

        // The token can outlive a deleted account; treat that as logged out.
        const user = await getUserById(userId);
        if (!user) {
            return sendUnauthorized(reply);
        }

        return user;
    });
};
