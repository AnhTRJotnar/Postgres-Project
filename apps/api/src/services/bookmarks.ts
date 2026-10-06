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

export async function listBookmarks(documentId: string): Promise<BookmarkDTO[]> {
    const bookmarks = await prisma.bookmark.findMany({
        where: { documentId },
        // Reading order: earlier pages first; same page -> oldest first
        orderBy: [{ pageNumber: "asc" }, { createdAt: "asc" }],
    });
    return bookmarks.map(toBookmarkDTO);
}

export async function createBookmark(documentId: string, input: BookmarkInput): Promise<BookmarkDTO> {
    const bookmark = await prisma.bookmark.create({
        data: { documentId, ...input },
    });
    return toBookmarkDTO(bookmark);
}

export async function deleteBookmark(bookmarkId: string): Promise<boolean> {
    const { count } = await prisma.bookmark.deleteMany({ where: { id: bookmarkId } });
    return count > 0;
}
