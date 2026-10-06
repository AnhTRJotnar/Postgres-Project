import AsyncStorage from "@react-native-async-storage/async-storage";
import type { LocalDocument } from "../../shared/types/document";

const STORAGE_KEY = "documents";

export async function getAllDocuments(): Promise<LocalDocument[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as LocalDocument[]) : [];
}

export async function addDocument(doc: LocalDocument): Promise<void> {
  const docs = await getAllDocuments();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([doc, ...docs]));
}