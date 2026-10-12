import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "preferredReadingMode";
const TAP_TO_CHANGE_PAGE_KEY = "tapToChangePage";

export type PreferredReadingMode =  "auto" | "scroll" | "book";

export async function getTapToChangePage(): Promise<boolean> {
  return (await AsyncStorage.getItem(TAP_TO_CHANGE_PAGE_KEY)) === "true";
}

export function saveTapToChangePage(enabled: boolean): Promise<void> {
  return AsyncStorage.setItem(TAP_TO_CHANGE_PAGE_KEY, String(enabled));
}

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