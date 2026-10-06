import type { FastifyPluginAsync } from "fastify";
import { getDocumentById, listDocuments } from "../services/documents.js";
import { z } from "zod";

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

const documentParamSchema = z.object({
  id: z.string().min(1),
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

    app.get("/documents/:id", async (request, reply) => {
        const parsed = documentParamSchema.safeParse(request.params);
        if (!parsed.success) {
            return reply.status(400).send({ 
                error: "Invalid document ID", 
                issues: parsed.error.issues.map((issue) => ({
                    path: issue.path.join("."),
                    message: issue.message 
                })) 
            });
        }

        const document = await getDocumentById(parsed.data.id);
        if (!document) {
            return reply.status(404).send({ error: "Document not found" });
        }
        return document;
    });
};