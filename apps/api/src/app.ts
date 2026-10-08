import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import { prisma } from "./db/prisma.js";
import { authRoutes } from "./routes/auth.js";
import { documentsRoutes } from "./routes/documents.js";
import { readingPositionRoutes } from "./routes/readingPositions.js";
import { bookmarkRoutes } from "./routes/bookmarks.js";

// Builds the app without starting it, so tests can send requests with app.inject().
export function buildApp(options: { logger?: boolean } = {}) {
  const app = Fastify({
    logger: options.logger ?? true,
  });

  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });

  // Unexpected errors are logged in full, but the client only gets a generic message,
  // so internal details (Prisma messages, file paths) never leave the server.
  app.setErrorHandler((error, request, reply) => {
    // Fastify's own errors (bad JSON, body too large, rate limit) carry a 4xx statusCode.
    const statusCode =
      error instanceof Error && "statusCode" in error && typeof error.statusCode === "number"
        ? error.statusCode
        : 500;
    if (statusCode >= 500) {
      request.log.error(error);
      return reply.status(500).send({ error: "Internal server error" });
    }
    return reply.status(statusCode).send({ error: error instanceof Error ? error.message : "Bad request" });
  });

  // Limits are set per route (see routes/auth.ts); nothing is limited by default.
  app.register(rateLimit, { global: false });

  app.get("/health", async () => {
    return {
      status: "ok",
      service: "kindle-pdf-reader-api",
    };
  });

  app.get("/health/db", async (request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: "ok", database: "reachable" };
    } catch (error) {
      request.log.error(error, "Database health check failed");
      return reply.code(503).send({ status: "error", database: "unreachable" });
    }
  });

  app.register(authRoutes);
  app.register(documentsRoutes);
  app.register(readingPositionRoutes);
  app.register(bookmarkRoutes);

  return app;
}
