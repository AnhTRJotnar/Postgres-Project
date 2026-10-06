import { z, type ZodError } from "zod";

// Ids are UUID v4, generated on the phone (Crypto.randomUUID) and kept on the server.
export const documentParamSchema = z.object({
    id: z.uuid(),
});

export const bookmarkParamSchema = z.object({
    bookmarkId: z.uuid(),
});

// One error shape for every endpoint: [{ path, message }]
export function toIssues(error: ZodError) {
    return error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
    }));
}
