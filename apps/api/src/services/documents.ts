import type { Document } from "../../generated/prisma/client.js";
import { prisma } from "../db/prisma.js";


export interface DocumentDto {
    id: string;
    title: string;
    originalFileName: string;
    fileHash?: string;
    fileSize?: number;
    pageCount?: number;
    thumbnailUri?: string;
    dateAdded: string;
    lastOpenedAt?: string;
    isFavorite: boolean;
    isFinished: boolean;
}

export interface DocumentPage{
    items: DocumentDto[];
    page: number;
    pageSize: number;
    total: number;
}

export function toDocumentDto(doc: Document): DocumentDto {
    return {
        id: doc.id,
        title: doc.title,
        originalFileName: doc.originalFileName,
        fileHash: doc.fileHash ?? undefined,
        fileSize: doc.fileSize ?? undefined,
        pageCount: doc.pageCount ?? undefined,
        thumbnailUri: doc.thumbnailUri ?? undefined,
        dateAdded: doc.dateAdded.toISOString(),
        lastOpenedAt: doc.lastOpenedAt?.toISOString(),
        isFavorite: doc.isFavorite,
        isFinished: doc.isFinished,
    };
}

export async function listDocuments(page: number, pageSize: number): Promise<DocumentPage> {
    const [rows, total] = await prisma.$transaction([
        prisma.document.findMany({
            skip: (page - 1) * pageSize,
            take: pageSize,
            orderBy: [{ dateAdded: "desc" }, { id: "asc" }],
        }),
        prisma.document.count(),
    ]);
    return {
        items: rows.map(toDocumentDto), page, pageSize, total,
    };
}