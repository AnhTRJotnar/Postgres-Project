export type LocalDocument = {
  id: string;
  title: string;
  originalFileName: string;
  localUri: string;
  fileHash?: string;
  fileSize?: number;
  pageCount?: number;
  thumbnailUri?: string;
  dateAdded: string;
  lastOpenedAt?: string;
  isFavorite: boolean;
  isFinished: boolean;
};