import type { Bookmark, ReadingMode } from "../../generated/prisma/client.js";
import { prisma } from "../db/prisma.js";

// Matches Bookmark in packages/shared. Missing optional values are omitted, never null.
export interface BookmarkDTO {
    id: string;
    documentId: string;
    label?: string;
    pageNumber: number;
    readingMode: ReadingMode;
    scrollOffsetY?: number;
    pageCoordinateX?: number;
    pageCoordinateY?: number;
    zoomScale?: number;
    textPreview?: string;
    createdAt: string;
    updatedAt: string;
}

// Input for creating a new bookmark. All optional values are omitted, never null.
export interface BookmarkInput {
    label?: string;
    pageNumber: number;
    readingMode: ReadingMode;
    scrollOffsetY?: number;
    pageCoordinateX?: number;
    pageCoordinateY?: number;
    zoomScale?: number;
    textPreview?: string;
}

// Functions for converting between Bookmark and BookmarkDTO, and for listing, creating, and deleting bookmarks.
export function toBookmarkDTO(bookmark: Bookmark): BookmarkDTO {
    return {
        id: bookmark.id,
        documentId: bookmark.documentId,
        label: bookmark.label ?? undefined,
        pageNumber: bookmark.pageNumber,
        readingMode: bookmark.readingMode,
        scrollOffsetY: bookmark.scrollOffsetY ?? undefined,
        pageCoordinateX: bookmark.pageCoordinateX ?? undefined,
        pageCoordinateY: bookmark.pageCoordinateY ?? undefined,
        zoomScale: bookmark.zoomScale ?? undefined,
        textPreview: bookmark.textPreview ?? undefined,
        createdAt: bookmark.createdAt.toISOString(),
        updatedAt: bookmark.updatedAt.toISOString(),
    };
}

// List all bookmarks for a given document, ordered by page number and creation time.
export async function listBookmarks(documentId: string): Promise<BookmarkDTO[]> {
    const bookmarks = await prisma.bookmark.findMany({
        where: { documentId },
        // Reading order: earlier pages first; same page -> oldest first
        orderBy: [{ pageNumber: "asc" }, { createdAt: "asc" }],
    });
    return bookmarks.map(toBookmarkDTO);
}

// Save a bookmark under the phone's id: create it if new, otherwise replace it.
// Safe to repeat: a retried request updates the same row instead of adding a copy.
// Returns null if the id already belongs to a bookmark of another document.
export async function saveBookmark(
    documentId: string,
    bookmarkId: string,
    input: BookmarkInput,
): Promise<{ bookmark: BookmarkDTO; created: boolean } | null> {
    const existing = await prisma.bookmark.findUnique({ where: { id: bookmarkId }, select: { documentId: true } });

    // A bookmark never moves to another document.
    if (existing && existing.documentId !== documentId) {
        return null;
    }

    // PUT replaces the bookmark: omitted optional fields are cleared.
    const data = {
        label: input.label ?? null,
        pageNumber: input.pageNumber,
        readingMode: input.readingMode,
        scrollOffsetY: input.scrollOffsetY ?? null,
        pageCoordinateX: input.pageCoordinateX ?? null,
        pageCoordinateY: input.pageCoordinateY ?? null,
        zoomScale: input.zoomScale ?? null,
        textPreview: input.textPreview ?? null,
    };

    const bookmark = await prisma.bookmark.upsert({
        where: { id: bookmarkId },
        create: { id: bookmarkId, documentId, ...data },
        update: data,
    });

    return { bookmark: toBookmarkDTO(bookmark), created: !existing };
}

// Delete a bookmark by its ID. Returns true if the bookmark was deleted, false if it did not exist.
export async function deleteBookmark(bookmarkId: string): Promise<boolean> {
    const { count } = await prisma.bookmark.deleteMany({ where: { id: bookmarkId } });
    return count > 0;
}
