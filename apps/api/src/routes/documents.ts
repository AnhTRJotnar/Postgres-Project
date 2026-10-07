import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { deleteDocument, getDocumentById, listDocuments, saveDocument } from "../services/documents.js";
import { documentParamSchema, toIssues } from "./validation.js";

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

const documentBodySchema = z.strictObject({
    title: z.string().trim().min(1).max(300),
    originalFileName: z.string().min(1).max(300),
    fileHash: z.string().max(128).optional(),
    fileSize: z.number().int().min(0).max(2_147_483_647).optional(),
    pageCount: z.number().int().min(1).optional(),
    dateAdded: z.iso.datetime(),
    lastOpenedAt: z.iso.datetime().optional(),
    isFavorite: z.boolean(),
    isFinished: z.boolean(),
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
    
//View document by ID
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

//Create or update document by ID
    app.put("/documents/:id", async (request, reply) => {
        const params = documentParamSchema.safeParse(request.params);
        if (!params.success) {
            return reply.status(400).send({ error: "Invalid document ID", issues: toIssues(params.error) });
        }

        const body = documentBodySchema.safeParse(request.body);
        if (!body.success) {
            return reply.status(400).send({ error: "Invalid document", issues: toIssues(body.error) });
        }

        const { document, created } = await saveDocument(params.data.id, body.data);
        return reply.status(created ? 201 : 200).send(document);
    });

//Delete document by ID
    app.delete("/documents/:id", async (request, reply) => {
        const params = documentParamSchema.safeParse(request.params);
        if (!params.success) {
            return reply.status(400).send({ error: "Invalid document ID", issues: toIssues(params.error) });
        }

        if (!(await deleteDocument(params.data.id))) {
            return reply.status(404).send({ error: "Document not found" });
        }

        return reply.status(204).send();
    });

};