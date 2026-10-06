import type { ZodError } from "zod";

// One error shape for every endpoint: [{ path, message }]
export function toIssues(error: ZodError) {
    return error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
    }));
}

