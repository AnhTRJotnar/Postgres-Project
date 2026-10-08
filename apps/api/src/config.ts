import "dotenv/config";

const jwtSecret = process.env["JWT_SECRET"];

// Refuse to start without a strong secret. Anyone who knows it can sign access tokens for any user.
if (!jwtSecret || jwtSecret.length < 43) {
    throw new Error(
        "JWT_SECRET is missing or shorter than 43 characters. Generate one with: " +
        `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`,
    );
}

export const authConfig = {
    jwtSecret: new TextEncoder().encode(jwtSecret),
    // Checked on every token, so a token made for another service or app is rejected.
    issuer: "kindle-pdf-reader-api",
    audience: "kindle-pdf-reader-app",
    accessTokenSeconds: 15 * 60,
    refreshTokenDays: 30,
};
