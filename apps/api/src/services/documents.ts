import type { Document } from "../../generated/prisma/client.js";
import { prisma } from "../db/prisma.js";


export interface DocumentDTO {
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
    items: DocumentDTO[];
    page: number;
    pageSize: number;
    total: number;
}

export function toDocumentDto(doc: Document): DocumentDTO {
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

export async function getDocumentById(id: string): Promise<DocumentDTO | null> {
    const doc = await prisma.document.findUnique({ where: { id } });
    return doc ? toDocumentDto(doc) : null;
}

export interface DocumentInput {
    title: string;
    originalFileName: string;
    fileHash?: string;
    fileSize?: number;
    pageCount?: number;
    dateAdded: string;
    lastOpenedAt?: string;
    isFavorite: boolean;
    isFinished: boolean;
}

export async function saveDocument(
    id: string,
    input: DocumentInput,
): Promise<{document: DocumentDTO; created: boolean}> {
    const existingDoc = await prisma.document.findUnique({ where: {id}, select: { id: true } });

    // PUT replaces the document: omitted optional fields are cleared.
    // dateAdded comes from the phone (when the PDF was imported), not from the server clock.
    const data = {
        title: input.title,
        originalFileName: input.originalFileName,
        fileHash: input.fileHash ?? null,
        fileSize: input.fileSize ?? null,
        pageCount: input.pageCount ?? null,
        dateAdded: new Date(input.dateAdded),
        lastOpenedAt: input.lastOpenedAt ? new Date(input.lastOpenedAt) : null,
        isFavorite: input.isFavorite,
        isFinished: input.isFinished,
    };

    const document = await prisma.document.upsert({
        where: { id },
        create: { id, ...data },
        update: data,
    });

    return { document: toDocumentDto(document), created: !existingDoc };
}