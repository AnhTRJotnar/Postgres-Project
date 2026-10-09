import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import type { Bookmark } from "@kindle-pdf-reader/shared";

// One storage key per document, holding that document's bookmarks as an array.
function keyFor(documentId: string): string {
  return `bookmarks:${documentId}`;
}

// What the reader knows. The repository fills in id, documentId and the timestamps.
export type BookmarkInput = Omit<Bookmark, "id" | "documentId" | "createdAt" | "updatedAt">;

async function readAll(documentId: string): Promise<Bookmark[]> {
  const raw = await AsyncStorage.getItem(keyFor(documentId));
  return raw ? (JSON.parse(raw) as Bookmark[]) : [];
}

async function writeAll(documentId: string, bookmarks: Bookmark[]): Promise<void> {
  await AsyncStorage.setItem(keyFor(documentId), JSON.stringify(bookmarks));
}

// Reading order, same as the API: earlier pages first; same page -> oldest first.
export async function listBookmarks(documentId: string): Promise<Bookmark[]> {
  const bookmarks = await readAll(documentId);
  return bookmarks.sort(
    (a, b) => a.pageNumber - b.pageNumber || a.createdAt.localeCompare(b.createdAt),
  );
}

export async function addBookmark(documentId: string, input: BookmarkInput): Promise<Bookmark> {
  const now = new Date().toISOString();

  // The API rejects empty or whitespace-only labels, so store "no label" instead.
  const label = input.label?.trim() || undefined;

  const bookmarks = await readAll(documentId);

  const alreadyExists = bookmarks.some(
    (bookmark) =>
      bookmark.pageNumber === input.pageNumber &&
      bookmark.readingMode === input.readingMode
  );

  if (alreadyExists) {
    throw new Error("This page is already bookmarked.");
  }

  const bookmark: Bookmark = {
    ...input,
    label,
    id: Crypto.randomUUID(),
    documentId,
    createdAt: now,
    updatedAt: now,
  };

  await writeAll(documentId, [...bookmarks, bookmark]);
  return bookmark;
}

// Returns false if the bookmark did not exist.
export async function deleteBookmark(documentId: string, bookmarkId: string): Promise<boolean> {
  const bookmarks = await readAll(documentId);
  const remaining = bookmarks.filter((b) => b.id !== bookmarkId);
  if (remaining.length === bookmarks.length) return false;

  await writeAll(documentId, remaining);
  return true;
}

// For "remove from library": no bookmarks are left behind for a deleted document.
export async function deleteAllBookmarks(documentId: string): Promise<void> {
  await AsyncStorage.removeItem(keyFor(documentId));
}
