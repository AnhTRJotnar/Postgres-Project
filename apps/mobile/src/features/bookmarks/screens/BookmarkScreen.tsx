import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Button, FlatList, StyleSheet, Text, View, Pressable
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { Bookmark } from "@kindle-pdf-reader/shared";

import type { RootStackParamList } from "../../../app/navigation/types";
import { deleteBookmark as deleteLocalBookmark, listBookmarks as listLocalBookmarks, } from "../../../database/repositories/bookmarkRepository";
import { deleteBookmark as deleteApiBookmark, listBookmarks as listApiBookmarks, saveBookmark as saveApiBookmark } from "../../../shared/api/bookmarksApi";

type Props = NativeStackScreenProps<RootStackParamList, "Bookmarks">;

export default function BookmarkScreen({ navigation, route }: Props) {
  const { documentId } = route.params;
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBookmarks = useCallback(async () => {
    setLoading(true);

    try {
      const localBookmarks = await listLocalBookmarks(documentId);
      setBookmarks(localBookmarks);

      if (localBookmarks.length > 0) {
        await Promise.allSettled(localBookmarks.map((bookmark) => saveApiBookmark(documentId, bookmark)));
      }
      else {
        const remoteBookmarks = await listApiBookmarks(documentId);
        setBookmarks(remoteBookmarks);
      }
    } catch (error) {
      console.warn("Could not load bookmarks:", error);
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useFocusEffect(useCallback(() => {
    void loadBookmarks();
  }, [loadBookmarks]));

  async function handleDelete(bookmarkId: string) {
    try {
      await deleteLocalBookmark(documentId, bookmarkId);
      setBookmarks((current) => current.filter((bookmark) => bookmark.id !== bookmarkId));
      await  deleteApiBookmark(bookmarkId);
    } catch (error) {
      Alert.alert("Could not delete bookmark", error instanceof Error ? error.message : "Something went wrong.");
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlatList
      data={bookmarks}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <Text style={styles.empty}>No bookmarks yet</Text>
      }
      renderItem={({ item }) => (
        <Pressable style={styles.bookmark} onPress={() => navigation.popTo("Reader", { documentId, pageNumber: item.pageNumber,   reloadKey: Date.now(), })}>
          <View style={styles.details}>
            <Text style={styles.label}>
              {item.label || `Page ${item.pageNumber}`}
            </Text>
            <Text>Page {item.pageNumber}</Text>
          </View>

          <Button title="Delete"
            onPress={() => handleDelete(item.id)}
          />
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    padding: 16,
    gap: 12,
  },
  empty: {
    textAlign: "center",
    marginTop: 80,
    fontSize: 18,
    color: "#888",
  },
  bookmark: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#f2f2f2",
  },
  details: {
    flex: 1,
    gap: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
  },
});