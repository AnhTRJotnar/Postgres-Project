import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Button,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../../app/navigation/types";
import type { LocalDocument } from "../../../shared/types/document";
import { getAllDocuments } from "../../../database/repositories/documentRepository";
import Pdf from "react-native-pdf";

type Props = NativeStackScreenProps<RootStackParamList, "Reader">;

export default function ReaderScreen({ navigation, route}: Props) {
    const { documentId } = route.params;
    const [document, setDocument] = useState<LocalDocument | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    useEffect(() => {
        getAllDocuments().then((documents) => {
            const found = documents.find((item) => item.id === documentId);

            if (!found) {
                setError("Document not found");
                return;
            }
            setDocument(found);
        }).catch(() => setError("Failed to load document"));
    }, [documentId]);

    if (error) {
        return (
            <View style={styles.center}>
                <Text>{error}</Text>
            </View>
        );
    }

    if (!document) {
        return (
        <View style={styles.center}>
            <ActivityIndicator />
        </View>
        );
    }

    return (
        <View style={styles.container}>
        <View style={styles.toolbar}>
            <Text numberOfLines={1} style={styles.title}>
            {document.title}
            </Text>
            <Button
            title="Bookmarks"
            onPress={() =>
                navigation.navigate("Bookmarks", { documentId })
            }
            />
        </View>

        <Pdf
            source={{ uri: document.localUri }}
            style={styles.pdf}
            onError={(pdfError) => {
            console.error("PDF failed to load", pdfError);
            setError("Could not open this PDF.");
            }}
        />
        </View>
    );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
  },
  title: {
    flex: 1,
    marginRight: 12,
    fontSize: 16,
    fontWeight: "600",
  },
  pdf: {
    flex: 1,
    width: "100%",
  },
});