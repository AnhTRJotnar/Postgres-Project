import type { ReadingPosition } from "@kindle-pdf-reader/shared";
import { ApiError, apiRequest } from "./client";

export type ReadingPositionInput = Omit<ReadingPosition, "id" | "documentId" | "updatedAt">;

export async function getReadingPosition(documentId: string): Promise<ReadingPosition | null> {
    try {
        return apiRequest<ReadingPosition>(
            `/documents/${documentId}/reading-position`
        );        
    }
    catch (error) {
        if (error instanceof ApiError && error.status === 404) {
            return null;
        }
        throw error;
    }
}

export function saveReadingPosition(documentId: string, position: ReadingPositionInput): Promise<ReadingPosition> {
  return apiRequest<ReadingPosition>(
    `/documents/${documentId}/reading-position`,
    {
      method: "PUT",
      body: JSON.stringify(position),
    }
  );    
}