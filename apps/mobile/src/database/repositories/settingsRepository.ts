import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "preferredReadingMode";

export type PreferredReadingMode =  "auto" | "scroll" | "book";

export async function getPreferredReadingMode(): Promise<PreferredReadingMode> {
  const value = await AsyncStorage.getItem(KEY);

  if (value === "scroll" || value === "book") {
    return value;
  }

  return "auto";
}

export function savePreferredReadingMode(
  mode: PreferredReadingMode
): Promise<void> {
  return AsyncStorage.setItem(KEY, mode);
}