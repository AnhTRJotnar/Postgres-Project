import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { documentParamSchema, toIssues } from "./validation.js";
import { getDocumentById } from "../services/documents.js";
import { getReadingPositionByDocumentId, saveReadingPosition } from "../services/readingPositions.js";

const readingPositionBodySchema = z.strictObject({
    pageNumber: z.number().int().min(1),
    progressPercent: z.number().min(0).max(100),
    readingMode: z.enum(["book", "scroll"]),
    scrollOffsetY: z.number().min(0).optional(),
    pageCoordinateX: z.number().optional(),
    pageCoordinateY: z.number().optional(),
    zoomScale: z.number().positive().optional(),
    topVisibleText: z.string().max(500).optional(),
});

export const readingPositionRoutes: FastifyPluginAsync = async (app) => {
    app.get("/documents/:id/reading-position", async (request, reply) => {
        const params = documentParamSchema.safeParse(request.params);
        if (!params.success) {
            return reply.status(400).send({ error: "Invalid document ID", issues: toIssues(params.error) });
        }

        if (!(await getDocumentById(params.data.id))) {
            return reply.status(404).send({ error: "Document not found" });
        }

        const position = await getReadingPositionByDocumentId(params.data.id);
        if (!position) {
            return reply.status(404).send({ error: "No reading position saved" });
        }
        return position;
    });

    app.put("/documents/:id/reading-position", async (request, reply) => {
        const params = documentParamSchema.safeParse(request.params);
        if (!params.success) {
            return reply.status(400).send({ error: "Invalid document ID", issues: toIssues(params.error) });
        }

        const body = readingPositionBodySchema.safeParse(request.body);
        if (!body.success) {
            return reply.status(400).send({ error: "Invalid reading position", issues: toIssues(body.error) });
        }

        if (!(await getDocumentById(params.data.id))) {
            return reply.status(404).send({ error: "Document not found" });
        }

        return saveReadingPosition(params.data.id, body.data);
    });
};
