import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import type { ReadingPosition } from "@kindle-pdf-reader/shared";

// One storage key per document: saving a position on every page turn
// never rewrites the positions of other documents.
function keyFor(documentId: string): string {
  return `readingPosition:${documentId}`;
}

// What the reader knows. The repository fills in id, documentId and updatedAt.
export type ReadingPositionInput = Omit<ReadingPosition, "id" | "documentId" | "updatedAt">;

export async function getReadingPosition(documentId: string): Promise<ReadingPosition | null> {
  const raw = await AsyncStorage.getItem(keyFor(documentId));
  return raw ? (JSON.parse(raw) as ReadingPosition) : null;
}

export async function saveReadingPosition(
  documentId: string,
  input: ReadingPositionInput,
): Promise<ReadingPosition> {
  const existing = await getReadingPosition(documentId);

  // Replaces the whole position, like the API's PUT: fields left out of input are cleared.
  const position: ReadingPosition = {
    ...input,
    id: existing?.id ?? Crypto.randomUUID(),
    documentId,
    updatedAt: new Date().toISOString(),
  };

  await AsyncStorage.setItem(keyFor(documentId), JSON.stringify(position));
  return position;
}

export async function deleteReadingPosition(documentId: string): Promise<void> {
  await AsyncStorage.removeItem(keyFor(documentId));
}
