import type { Bookmark } from "@kindle-pdf-reader/shared";
import { ApiError, apiRequest } from "./client";

export type BookmarkInput = Omit<Bookmark, "id" | "documentId" | "createdAt" | "updatedAt">;

export function listBookmarks(documentId: string): Promise<Bookmark[]> {
    return apiRequest<Bookmark[]>(`/documents/${documentId}/bookmarks`);
}

export function saveBookmark(documentId: string, bookmark: Bookmark): Promise<Bookmark> {
    const { id, documentId: _documentId, createdAt: _createdAt, updatedAt: _updatedAt, ...body} = bookmark;

    return apiRequest<Bookmark>(`/documents/${documentId}/bookmarks/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(body),
    }
  );
}

export async function deleteBookmark(bookmarkId: string): Promise<void> {
    try {
        await apiRequest<void>(`/bookmarks/${bookmarkId}`, {
            method: "DELETE",
        });
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
            return;
        }

        throw error;
    }
} 