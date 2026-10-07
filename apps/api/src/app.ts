import Fastify from "fastify";
import { prisma } from "./db/prisma.js";
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

  app.register(documentsRoutes);
  app.register(readingPositionRoutes);
  app.register(bookmarkRoutes);

  return app;
}
