import Fastify from "fastify";
import { prisma } from "./db/prisma.js";
import { documentsRoutes } from "./routes/documents.js";
import { readingPositionRoutes } from "./routes/readingPositions.js";
import { bookmarkRoutes } from "./routes/bookmarks.js";


const app = Fastify({
  logger: true,
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


const start = async () => {
  try {
    await app.listen({
      port: 3000,
      host: "127.0.0.1",
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();
