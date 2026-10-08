import { createHash, randomBytes } from "node:crypto";
import { Algorithm, hash, verify } from "@node-rs/argon2";
import { SignJWT, jwtVerify } from "jose";
import { Prisma, type User } from "../../generated/prisma/client.js";
import { authConfig } from "../config.js";
import { prisma } from "../db/prisma.js";

// What the API shows about a user. Never includes the password hash.
export interface UserDTO {
    id: string;
    email: string;
    createdAt: string;
}

// Returned by register, login and refresh.
export interface AuthSession {
    user: UserDTO;
    accessToken: string;
    // Seconds until the access token expires.
    expiresIn: number;
    refreshToken: string;
}

export function toUserDto(user: User): UserDTO {
    return {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
    };
}

// argon2id with the OWASP minimum: 19 MiB memory, 2 passes, 1 thread.
// Written out instead of relying on the library defaults, so an upgrade can't weaken them.
const argon2Options = {
    algorithm: Algorithm.Argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
};

// NFKC makes the same password typed on different keyboards produce the same bytes (NIST SP 800-63B).
function hashPassword(password: string): Promise<string> {
    return hash(password.normalize("NFKC"), argon2Options);
}

// Checked when the email is unknown or has no password, so a failed login takes
// the same time either way and doesn't reveal which emails have accounts.
const dummyPasswordHash = hashPassword(randomBytes(32).toString("base64url"));

async function passwordMatches(password: string, passwordHash: string | null): Promise<boolean> {
    const matches = await verify(passwordHash ?? (await dummyPasswordHash), password.normalize("NFKC"));
    return passwordHash !== null && matches;
}

// Refresh tokens are 32 random bytes, so a fast hash is enough (nothing to brute-force),
// and the same token always gives the same hash, which makes it searchable.
function hashRefreshToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

async function createSession(user: User): Promise<AuthSession> {
    const refreshToken = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + authConfig.refreshTokenDays * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
        data: { userId: user.id, tokenHash: hashRefreshToken(refreshToken), expiresAt },
    });

    const accessToken = await new SignJWT({})
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(user.id)
        .setIssuer(authConfig.issuer)
        .setAudience(authConfig.audience)
        .setIssuedAt()
        .setExpirationTime(`${authConfig.accessTokenSeconds}s`)
        .sign(authConfig.jwtSecret);

    return { user: toUserDto(user), accessToken, expiresIn: authConfig.accessTokenSeconds, refreshToken };
}

// Returns the user id of a valid access token, or null for anything else.
export async function verifyAccessToken(token: string): Promise<string | null> {
    try {
        const { payload } = await jwtVerify(token, authConfig.jwtSecret, {
            // Only HS256: a token claiming another algorithm (including "none") is rejected.
            algorithms: ["HS256"],
            issuer: authConfig.issuer,
            audience: authConfig.audience,
        });
        return payload.sub ?? null;
    } catch {
        return null;
    }
}

// Emails arrive trimmed and lowercased from the route. Returns null if the email is taken.
export async function registerUser(email: string, password: string): Promise<AuthSession | null> {
    // Hash before checking the email, so "taken" and "new" take the same time.
    const passwordHash = await hashPassword(password);

    try {
        const user = await prisma.user.create({ data: { email, passwordHash } });
        return createSession(user);
    } catch (error) {
        // P2002: unique constraint, the email is already registered (also covers two requests at once).
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return null;
        }
        throw error;
    }
}

// Returns null for an unknown email, a wrong password or a Google-only account, without saying which.
export async function loginWithPassword(email: string, password: string): Promise<AuthSession | null> {
    const user = await prisma.user.findUnique({ where: { email } });

    // Check the password first, even for an unknown email: "!user || ..." would skip the slow hash and be measurably faster.
    const matches = await passwordMatches(password, user?.passwordHash ?? null);
    if (!matches || !user) {
        return null;
    }

    return createSession(user);
}

// Trades a refresh token for a new session. Each refresh token works once.
export async function refreshSession(refreshToken: string): Promise<AuthSession | null> {
    const tokenHash = hashRefreshToken(refreshToken);
    const now = new Date();

    // Revoke and check in one statement, so two requests with the same token can't both succeed.
    const { count } = await prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null, expiresAt: { gt: now } },
        data: { revokedAt: now },
    });

    const row = await prisma.refreshToken.findUnique({ where: { tokenHash }, include: { user: true } });

    if (count === 1 && row) {
        return createSession(row.user);
    }

    // A token that was already used is being used again: someone else may have a copy.
    // End every session of that user, so the copy stops working too.
    if (row?.revokedAt) {
        await prisma.refreshToken.updateMany({
            where: { userId: row.userId, revokedAt: null },
            data: { revokedAt: now },
        });
    }

    return null;
}

// Logout. Unknown or already revoked tokens are ignored.
export async function revokeRefreshToken(refreshToken: string): Promise<void> {
    await prisma.refreshToken.updateMany({
        where: { tokenHash: hashRefreshToken(refreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
    });
}

export async function getUserById(id: string): Promise<UserDTO | null> {
    const user = await prisma.user.findUnique({ where: { id } });
    return user ? toUserDto(user) : null;
}
