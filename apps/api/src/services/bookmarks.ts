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

// Create a new bookmark for a given document.
export async function createBookmark(documentId: string, input: BookmarkInput): Promise<BookmarkDTO> {
    const bookmark = await prisma.bookmark.create({
        data: { documentId, ...input },
    });
    return toBookmarkDTO(bookmark);
}

// Delete a bookmark by its ID. Returns true if the bookmark was deleted, false if it did not exist.
export async function deleteBookmark(bookmarkId: string): Promise<boolean> {
    const { count } = await prisma.bookmark.deleteMany({ where: { id: bookmarkId } });
    return count > 0;
}
