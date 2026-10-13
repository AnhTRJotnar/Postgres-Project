import AsyncStorage from "@react-native-async-storage/async-storage";
import type { LocalDocument } from "../../shared/types/document";

const STORAGE_KEY = "documents";

// CRUD
export async function getAllDocuments(): Promise<LocalDocument[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as LocalDocument[]) : [];
}

export async function addDocument(doc: LocalDocument): Promise<void> {
  const docs = await getAllDocuments();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([doc, ...docs]));
}

export async function updateDocument(documentId: string, changes: Partial<Pick<LocalDocument, "pageCount">>,): Promise<void> {
  const documents = await getAllDocuments();
  const index = documents.findIndex((document) => document.id === documentId);
  if (index === -1) {
    throw new Error(`Document with id ${documentId} not found`);
  }

  documents[index] = {
    ...documents[index],
    ...changes,
  };

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
}