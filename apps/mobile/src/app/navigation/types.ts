export type RootStackParamList = {
  Library: undefined;
  Reader: { documentId: string; pageNumber?: number;   reloadKey?: number; };
  Bookmarks: { documentId: string };
  Settings: undefined;
};