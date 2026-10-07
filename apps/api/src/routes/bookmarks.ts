import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { createBookmark, deleteBookmark, listBookmarks } from "../services/bookmarks.js";
import { getDocumentById } from "../services/documents.js";
import { bookmarkParamSchema, documentParamSchema, toIssues } from "./validation.js";


const bookmarkBodySchema = z.strictObject({
    label: z.string().trim().min(1).max(100).optional(),
    pageNumber: z.number().int().min(1),
    readingMode: z.enum(["book", "scroll"]),
    scrollOffsetY: z.number().min(0).optional(),
    pageCoordinateX: z.number().optional(),
    pageCoordinateY: z.number().optional(),
    zoomScale: z.number().positive().optional(),
    textPreview: z.string().max(500).optional(),
});

// Routes for managing bookmarks associated with documents
export const bookmarkRoutes: FastifyPluginAsync = async (app) => {
    //Get bookmarks by document ID
    app.get("/documents/:id/bookmarks", async (request, reply) => {
        const params = documentParamSchema.safeParse(request.params);
        if (!params.success) {
            return reply.status(400).send({ error: "Invalid document ID", issues: toIssues(params.error) });
        }

        if (!(await getDocumentById(params.data.id))) {
            return reply.status(404).send({ error: "Document not found" });
        }

        return listBookmarks(params.data.id);
    });

    //Create a new bookmark for a document
    app.post("/documents/:id/bookmarks", async (request, reply) => {
        const params = documentParamSchema.safeParse(request.params);
        if (!params.success) {
            return reply.status(400).send({ error: "Invalid document ID", issues: toIssues(params.error) });
        }

        const body = bookmarkBodySchema.safeParse(request.body);
        if (!body.success) {
            return reply.status(400).send({ error: "Invalid bookmark", issues: toIssues(body.error) });
        }

        if (!(await getDocumentById(params.data.id))) {
            return reply.status(404).send({ error: "Document not found" });
        }

        const bookmark = await createBookmark(params.data.id, body.data);
        return reply.status(201).send(bookmark);
    });
    
    //Delete a bookmark by its ID
    app.delete("/bookmarks/:bookmarkId", async (request, reply) => {
        const params = bookmarkParamSchema.safeParse(request.params);
        if (!params.success) {
            return reply.status(400).send({ error: "Invalid bookmark ID", issues: toIssues(params.error) });
        }

        if (!(await deleteBookmark(params.data.bookmarkId))) {
            return reply.status(404).send({ error: "Bookmark not found" });
        }

        return reply.status(204).send();
    });
};
