import type { Document } from "../../generated/prisma/client.js";
import { prisma } from "../db/prisma.js";

// Represents a document in the API, with optional fields omitted (never null).
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

// Represents a paginated list of documents, including the current page, page size, and total number of documents.
export interface DocumentPage{
    items: DocumentDTO[];
    page: number;
    pageSize: number;
    total: number;
}

// Convert a Document from the database to a DocumentDTO for API responses.
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

// List documents with pagination, ordered by date added (newest first) and then by ID (ascending).
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

// Get a document by its ID. Returns null if the document does not exist.
export async function getDocumentById(id: string): Promise<DocumentDTO | null> {
    const doc = await prisma.document.findUnique({ where: { id } });
    return doc ? toDocumentDto(doc) : null;
}

// Input for creating or updating a document. All optional values are omitted, never null.
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

// Save a document by ID. If the document exists, it is updated; if not, it is created. Returns the saved document and a boolean indicating whether it was created (true) or updated (false).
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

// The database cascades the delete to the document's reading position and bookmarks.
export async function deleteDocument(id: string): Promise<boolean> {
    const { count } = await prisma.document.deleteMany({ where: { id } });
    return count > 0;
}