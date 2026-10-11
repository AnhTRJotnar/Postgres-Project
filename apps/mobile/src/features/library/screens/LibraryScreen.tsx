import { useCallback, useState } from "react";
import { View, Text, Button, FlatList, Pressable, Alert, StyleSheet, Modal, } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../../../app/navigation/types";
import type { LocalDocument } from "../../../shared/types/document";
import { getAllDocuments } from "../../../database/repositories/documentRepository";
import { importPdf } from "../../import/services/importPdf";
import { registerDocument } from "../../../shared/api/documentsApi";
import { useTheme } from "../../../shared/theme/ThemeContext";

type Props = NativeStackScreenProps<RootStackParamList, "Library">;

export default function LibraryScreen({ navigation }: Props) {
  const [documents, setDocuments] = useState<LocalDocument[]>([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const { colors } = useTheme();

  useFocusEffect(
    useCallback(() => {
      getAllDocuments().then((docs) => {
        setDocuments(docs);

        Promise.allSettled(docs.map(registerDocument));
      });
    }, [])
  );

  async function handleImport() {
    try {
      const doc = await importPdf();
      if (doc) {
        setDocuments((prev) => [doc, ...prev]);

        registerDocument(doc).catch((error) => {
          console.warn("Document will sync later:", error);
        });
      }
    } catch (error) {
      Alert.alert(
        "Could not import",
        error instanceof Error ? error.message : "Something went wrong."
      );
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Library
        </Text>

        <Pressable
          style={styles.iconButton}
          onPress={() => setMenuVisible(true)}
          accessibilityLabel="Open library options"
        >
          <Ionicons
            name="ellipsis-vertical"
            size={24}
            color={colors.text}
          />
        </Pressable>
        <Modal
          visible={menuVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setMenuVisible(false)}
        >
          <Pressable
            style={styles.menuBackdrop}
            onPress={() => setMenuVisible(false)}
          >
            <Pressable
              style={[
                styles.menu,
                { backgroundColor: colors.surface },
              ]}
              onPress={(event) => event.stopPropagation()}
            >
              <Pressable
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  navigation.navigate("Settings");
                }}
              >
                <Ionicons
                  name="settings-outline"
                  size={21}
                  color={colors.text}
                />
                <Text style={[styles.menuText, { color: colors.text }]}>
                  Settings
                </Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
      <FlatList
        style={{ backgroundColor: colors.background }}
        data={documents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.mutedText }]}>Your library is empty</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={[styles.card, { backgroundColor: colors.surface },]}
            onPress={() => navigation.navigate("Reader", { documentId: item.id })}
          >
            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={[styles.cardMeta, { color: colors.mutedText }]}>
              {item.fileSize ? `${(item.fileSize / 1024 / 1024).toFixed(1)} MB` : ""}
            </Text>
          </Pressable>
        )}
      />

      <View style={[styles.footer, { backgroundColor: colors.background },]}>
        <Pressable style={styles.importButton} onPress={handleImport}>
          <Text style={styles.importButtonText}>Import PDF</Text>
        </Pressable>
      </View>
    </View>
  )
}


const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, gap: 12, flexGrow: 1 },
  listContent: {
    padding: 16,
    gap: 12,
    flexGrow: 1,
    paddingBottom: 16,
  },
  empty: { textAlign: "center", marginTop: 80, fontSize: 18, color: "#888" },
  card: { padding: 16, borderRadius: 12, backgroundColor: "#f2f2f2" },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  cardMeta: { marginTop: 4, fontSize: 13, color: "#666" },
  footer: { padding: 16, gap: 8 },
  header: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: 16,
  paddingVertical: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  iconButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  menuBackdrop: {
    flex: 1,
    alignItems: "flex-end",
    paddingTop: 58,
    paddingRight: 16,
    backgroundColor: "rgba(0, 0, 0, 0.15)",
  },
  menu: {
    minWidth: 170,
    padding: 8,
    borderRadius: 12,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  menuItem: {
    minHeight: 46,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  menuText: {
    fontSize: 16,
  },
  importButton: {
    minHeight: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4f8cff",
  },
  importButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
