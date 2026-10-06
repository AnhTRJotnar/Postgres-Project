import { useCallback, useState } from "react";
import {
  View,
  Text,
  Button,
  FlatList,
  Pressable,
  Alert,
  StyleSheet,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../../../app/navigation/types";
import type { LocalDocument } from "../../../shared/types/document";
import { getAllDocuments } from "../../../database/repositories/documentRepository";
import { importPdf } from "../../import/services/importPdf";

type Props = NativeStackScreenProps<RootStackParamList, "Library">;

export default function LibraryScreen({ navigation }: Props) {
  const [documents, setDocuments] = useState<LocalDocument[]>([]);

  useFocusEffect(
    useCallback(() => {
      getAllDocuments().then(setDocuments);
    }, [])
  );

  async function handleImport() {
    try {
      const doc = await importPdf();
      if (doc) setDocuments((prev) => [doc, ...prev]);
    } catch (error) {
      Alert.alert(
        "Could not import",
        error instanceof Error ? error.message : "Something went wrong."
      );
    }
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={documents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>Your library is empty</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate("Reader", { documentId: item.id })}
          >
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.cardMeta}>
              {item.fileSize ? `${(item.fileSize / 1024 / 1024).toFixed(1)} MB` : ""}
            </Text>
          </Pressable>
        )}
      />

      <View style={styles.footer}>
        <Button title="Import PDF" onPress={handleImport} />
        <Button title="Settings" onPress={() => navigation.navigate("Settings")} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, gap: 12, flexGrow: 1 },
  empty: { textAlign: "center", marginTop: 80, fontSize: 18, color: "#888" },
  card: { padding: 16, borderRadius: 12, backgroundColor: "#f2f2f2" },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  cardMeta: { marginTop: 4, fontSize: 13, color: "#666" },
  footer: { padding: 16, gap: 8 },
});
