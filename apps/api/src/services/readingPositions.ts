import type { ReadingMode, ReadingPosition } from "../../generated/prisma/client.js";
import { prisma } from "../db/prisma.js";

export interface ReadingPositionDTO {
    id: string;
    documentId: string;
    pageNumber: number;
    progressPercent: number;
    readingMode: ReadingMode;
    scrollOffsetY?: number;
    pageCoordinateX?: number;
    pageCoordinateY?: number;
    zoomScale?: number;
    topVisibleText?: string;
    updatedAt: string;
}

export interface ReadingPositionInput {
    pageNumber: number;
    progressPercent: number;
    readingMode: ReadingMode;
    scrollOffsetY?: number;
    pageCoordinateX?: number;
    pageCoordinateY?: number;
    zoomScale?: number;
    topVisibleText?: string;
}

export function toReadingPositionDto(pos: ReadingPosition): ReadingPositionDTO {
    return {
        id: pos.id,
        documentId: pos.documentId,
        pageNumber: pos.pageNumber,
        progressPercent: pos.progressPercent,
        readingMode: pos.readingMode,
        scrollOffsetY: pos.scrollOffsetY ?? undefined,
        pageCoordinateX: pos.pageCoordinateX ?? undefined,
        pageCoordinateY: pos.pageCoordinateY ?? undefined,
        zoomScale: pos.zoomScale ?? undefined,
        topVisibleText: pos.topVisibleText ?? undefined,
        updatedAt: pos.updatedAt.toISOString(),
    };
}

export async function getReadingPositionByDocumentId(documentId: string): Promise<ReadingPositionDTO | null> {
    const pos = await prisma.readingPosition.findUnique({ where: { documentId } });
    return pos ? toReadingPositionDto(pos) : null;
}

export async function saveReadingPosition(
    documentId: string,
    input: ReadingPositionInput,
): Promise<ReadingPositionDTO> {
    // PUT replaces the whole position: an omitted optional field is cleared,
    // so a scroll offset saved in scroll mode doesn't linger after switching to book mode.
    const data = {
        pageNumber: input.pageNumber,
        progressPercent: input.progressPercent,
        readingMode: input.readingMode,
        scrollOffsetY: input.scrollOffsetY ?? null,
        pageCoordinateX: input.pageCoordinateX ?? null,
        pageCoordinateY: input.pageCoordinateY ?? null,
        zoomScale: input.zoomScale ?? null,
        topVisibleText: input.topVisibleText ?? null,
    };

    const position = await prisma.readingPosition.upsert({
        where: { documentId },
        create: { documentId, ...data },
        update: data,
    });

    return toReadingPositionDto(position);
}