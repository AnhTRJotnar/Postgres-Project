import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { randomInt, randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { SignJWT } from "jose";
import { buildApp } from "./app.js";
import { authConfig } from "./config.js";
import { prisma } from "./db/prisma.js";

// These tests run against the local development database (Docker must be running).
// Every test uses fresh random emails, and the users are deleted afterwards
// (their refresh tokens go with them through the cascade).

let app: FastifyInstance;
const createdEmails: string[] = [];
const password = "correct horse battery staple";

before(async () => {
    app = buildApp({ logger: false });
    // Test-only route to check that unexpected errors don't leak details.
    app.get("/test/crash", async () => {
        throw new Error("secret internal detail");
    });
    await app.ready();
});

after(async () => {
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
    await app.close();
});

function newEmail(): string {
    const email = `test-${randomUUID()}@example.com`;
    createdEmails.push(email);
    return email;
}

// A different address per call, so the per-IP rate limits only apply where a test wants them.
function randomIp(): string {
    return `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`;
}

function post(url: string, payload: Record<string, unknown>, remoteAddress = randomIp()) {
    return app.inject({ method: "POST", url, payload, remoteAddress });
}

async function register(email = newEmail()) {
    const res = await post("/auth/register", { email, password });
    assert.equal(res.statusCode, 201);
    return res.json();
}

function getMe(authorization?: string) {
    return app.inject({ method: "GET", url: "/me", headers: authorization ? { authorization } : {} });
}

describe("register", () => {
    test("returns 201 with a session and stores an argon2id hash, never the password", async () => {
        const email = newEmail();
        const res = await post("/auth/register", { email, password });

        assert.equal(res.statusCode, 201);
        assert.equal(res.headers["cache-control"], "no-store");
        const body = res.json();
        assert.equal(body.user.email, email);
        assert.equal(body.expiresIn, 900);
        assert.equal(typeof body.accessToken, "string");
        assert.equal(typeof body.refreshToken, "string");
        assert.ok(!res.body.includes(password));
        assert.ok(!("passwordHash" in body.user));

        const user = await prisma.user.findUniqueOrThrow({ where: { email } });
        assert.match(user.passwordHash ?? "", /^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);

        const token = await prisma.refreshToken.findFirstOrThrow({ where: { userId: user.id } });
        assert.notEqual(token.tokenHash, body.refreshToken);
        assert.match(token.tokenHash, /^[0-9a-f]{64}$/);
    });

    test("lowercases the email and returns 409 for the same email in other casing", async () => {
        const email = newEmail();
        await register(email);

        const again = await post("/auth/register", { email: `  ${email.toUpperCase()} `, password });
        assert.equal(again.statusCode, 409);
        assert.deepEqual(again.json(), { error: "Email already registered" });
    });

    test("rejects a 14-character password, a bad email and unknown keys, without echoing the password", async () => {
        const res = await post("/auth/register", { email: "not-an-email", password: "fourteen-chars", isAdmin: true });

        assert.equal(res.statusCode, 400);
        const paths = res.json().issues.map((issue: { path: string }) => issue.path);
        assert.ok(paths.includes("email"));
        assert.ok(paths.includes("password"));
        assert.ok(paths.includes(""));
        assert.ok(!res.body.includes("fourteen-chars"));
    });
});

describe("login", () => {
    test("returns a session for the right password", async () => {
        const email = newEmail();
        await register(email);

        const res = await post("/auth/login", { email: email.toUpperCase(), password });
        assert.equal(res.statusCode, 200);
        assert.equal(res.json().user.email, email);
    });

    test("gives the same 401 for a wrong password and an unknown email", async () => {
        const email = newEmail();
        await register(email);

        const wrongPassword = await post("/auth/login", { email, password: "wrong password, long enough" });
        const unknownEmail = await post("/auth/login", { email: newEmail(), password });

        assert.equal(wrongPassword.statusCode, 401);
        assert.equal(unknownEmail.statusCode, 401);
        assert.deepEqual(wrongPassword.json(), { error: "Invalid email or password" });
        assert.deepEqual(unknownEmail.json(), wrongPassword.json());
    });

    test("limits attempts per email, even from different addresses", async () => {
        const email = newEmail();
        await register(email);

        for (let attempt = 1; attempt <= 5; attempt++) {
            const res = await post("/auth/login", { email, password: "wrong password, long enough" });
            assert.equal(res.statusCode, 401);
        }

        // The 6th try is blocked even with the right password.
        const blocked = await post("/auth/login", { email, password });
        assert.equal(blocked.statusCode, 429);
        assert.ok(blocked.headers["retry-after"]);
    });

    test("limits attempts per address, across different emails", async () => {
        const ip = randomIp();
        for (let attempt = 1; attempt <= 10; attempt++) {
            const res = await post("/auth/login", { email: newEmail(), password }, ip);
            assert.equal(res.statusCode, 401);
        }

        const blocked = await post("/auth/login", { email: newEmail(), password }, ip);
        assert.equal(blocked.statusCode, 429);
    });
});

describe("access token", () => {
    test("GET /me returns the user for a valid token", async () => {
        const session = await register();

        const res = await getMe(`Bearer ${session.accessToken}`);
        assert.equal(res.statusCode, 200);
        assert.deepEqual(res.json(), session.user);
    });

    test("GET /me returns the same 401 for missing, malformed, forged and expired tokens", async () => {
        const session = await register();
        const sign = (jwt: SignJWT) => jwt.setProtectedHeader({ alg: "HS256" }).setSubject(session.user.id).sign(authConfig.jwtSecret);
        const valid = () => new SignJWT({}).setIssuer(authConfig.issuer).setAudience(authConfig.audience);

        const wrongSecret = await new SignJWT({})
            .setProtectedHeader({ alg: "HS256" })
            .setSubject(session.user.id)
            .setIssuer(authConfig.issuer)
            .setAudience(authConfig.audience)
            .setExpirationTime("15m")
            .sign(new TextEncoder().encode("x".repeat(64)));
        const expired = await sign(valid().setExpirationTime(Math.floor(Date.now() / 1000) - 60));
        const otherAudience = await sign(new SignJWT({}).setIssuer(authConfig.issuer).setAudience("another-app").setExpirationTime("15m"));
        // "alg: none" tokens have no signature at all.
        const unsigned = [
            Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url"),
            Buffer.from(JSON.stringify({ sub: session.user.id, iss: authConfig.issuer, aud: authConfig.audience })).toString("base64url"),
            "",
        ].join(".");
        const [header, payload] = session.accessToken.split(".");
        const tampered = `${header}.${payload}.${"A".repeat(43)}`;

        for (const authorization of [
            undefined,
            "Bearer",
            `Basic ${session.accessToken}`,
            `Bearer ${wrongSecret}`,
            `Bearer ${expired}`,
            `Bearer ${otherAudience}`,
            `Bearer ${unsigned}`,
            `Bearer ${tampered}`,
        ]) {
            const res = await getMe(authorization);
            assert.equal(res.statusCode, 401, `expected 401 for ${authorization}`);
            assert.deepEqual(res.json(), { error: "Unauthorized" });
            assert.equal(res.headers["www-authenticate"], "Bearer");
        }
    });
});

describe("refresh and logout", () => {
    test("refresh returns new tokens, and the old refresh token stops working", async () => {
        const first = await register();

        const second = await post("/auth/refresh", { refreshToken: first.refreshToken });
        assert.equal(second.statusCode, 200);
        assert.notEqual(second.json().refreshToken, first.refreshToken);

        const reused = await post("/auth/refresh", { refreshToken: first.refreshToken });
        assert.equal(reused.statusCode, 401);
        assert.deepEqual(reused.json(), { error: "Invalid refresh token" });
    });

    test("reusing an old refresh token ends every session of that user", async () => {
        const first = await register();
        const login = await post("/auth/login", { email: first.user.email, password });
        const second = await post("/auth/refresh", { refreshToken: first.refreshToken });

        // Someone replays the first token: all of the user's refresh tokens are revoked.
        await post("/auth/refresh", { refreshToken: first.refreshToken });

        const fromRefresh = await post("/auth/refresh", { refreshToken: second.json().refreshToken });
        const fromLogin = await post("/auth/refresh", { refreshToken: login.json().refreshToken });
        assert.equal(fromRefresh.statusCode, 401);
        assert.equal(fromLogin.statusCode, 401);
    });

    test("logout returns 204 and revokes the refresh token; unknown tokens also get 204", async () => {
        const session = await register();

        const logout = await post("/auth/logout", { refreshToken: session.refreshToken });
        assert.equal(logout.statusCode, 204);

        const refresh = await post("/auth/refresh", { refreshToken: session.refreshToken });
        assert.equal(refresh.statusCode, 401);

        const unknown = await post("/auth/logout", { refreshToken: "not-a-real-token" });
        assert.equal(unknown.statusCode, 204);
    });

    test("an unknown refresh token gets 401", async () => {
        const res = await post("/auth/refresh", { refreshToken: "not-a-real-token" });
        assert.equal(res.statusCode, 401);
    });
});

describe("errors", () => {
    test("unexpected errors return a generic 500 without internal details", async () => {
        const res = await app.inject({ method: "GET", url: "/test/crash" });
        assert.equal(res.statusCode, 500);
        assert.deepEqual(res.json(), { error: "Internal server error" });
    });

    test("invalid JSON still returns a 400", async () => {
        const res = await app.inject({
            method: "POST",
            url: "/auth/login",
            headers: { "content-type": "application/json" },
            payload: "{not json",
            remoteAddress: randomIp(),
        });
        assert.equal(res.statusCode, 400);
    });
});
