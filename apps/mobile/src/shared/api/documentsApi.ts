import type { LocalDocument } from "../../shared/types/document";
import { apiRequest } from "./client";

export function registerDocument(document: LocalDocument) {
    const { localUri, thumbnailUri, ...body } = document;

    return apiRequest(`/documents/${document.id}`, {
        method: "PUT",
        body: JSON.stringify(body),
    });
}