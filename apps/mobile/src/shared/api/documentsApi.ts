import type { LocalDocument } from "../../shared/types/document";
import { apiRequest } from "./client";

export function registerDocument(document: LocalDocument) {
    // id goes in the URL; localUri and thumbnailUri are device-only paths.
    const { id, localUri, thumbnailUri, ...body } = document;

    return apiRequest(`/documents/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
    });
}
