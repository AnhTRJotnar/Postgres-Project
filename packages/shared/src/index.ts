// Shared contract between apps/mobile (local storage) and apps/api (PostgreSQL).
// Dates are ISO 8601 strings so the same shapes survive JSON and AsyncStorage.

export type ReadingMode = "book" | "scroll";

export const READING_MODES: readonly ReadingMode[] = ["book", "scroll"];

export interface LocalDocument {
  id: string;
  title: string;
  originalFileName: string;
  /** file:// URI inside the app's own storage. Device-only; never sent to the API. */
  localUri: string;
  fileHash?: string;
  fileSize?: number;
  pageCount?: number;
  thumbnailUri?: string;
  dateAdded: string;
  lastOpenedAt?: string;
  isFavorite: boolean;
  isFinished: boolean;
}

/**
 * Exact position, not just a page. Scanned PDFs have no reliable text lines,
 * so we keep enough geometry (offset, coordinates, zoom) to land on the same spot.
 */
export interface ReadingPosition {
  id: string;
  documentId: string;
  /** 1-based page number. */
  pageNumber: number;
  /** 0–100. */
  progressPercent: number;
  readingMode: ReadingMode;
  scrollOffsetY?: number;
  pageCoordinateX?: number;
  pageCoordinateY?: number;
  zoomScale?: number;
  topVisibleText?: string;
  updatedAt: string;
}

export interface Bookmark {
  id: string;
  documentId: string;
  label?: string;
  /** 1-based page number. */
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
