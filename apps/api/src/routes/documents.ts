import type { FastifyPluginAsync } from "fastify";
import { listDocuments } from "../services/documents.js";
import { z } from "zod";

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export const documentsRoutes: FastifyPluginAsync = async (app) => {
    app.get("/documents", async (request, reply) => {
        const parsed = listQuerySchema.safeParse(request.query);
        if (!parsed.success) {
            return reply.status(400).send({ 
                error: "Invalid query parameters", 
                issues: parsed.error.issues.map((issue) => ({ 
                    path: issue.path.join("."),
                    message: issue.message 
                })) 
            });
        }
        const { page, pageSize } = parsed.data;
        return listDocuments(page, pageSize);
    });
};