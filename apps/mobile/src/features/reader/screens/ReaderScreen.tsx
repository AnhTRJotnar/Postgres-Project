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
import {
  getReadingPosition as getLocalReadingPosition,
  saveReadingPosition as saveLocalReadingPosition,
} from "../../../database/repositories/readingPositionRepository";
import {
  getReadingPosition as getApiReadingPosition,
  saveReadingPosition as saveApiReadingPosition,
} from "../../../shared/api/readingPositionsApi";

type Props = NativeStackScreenProps<RootStackParamList, "Reader">;

export default function ReaderScreen({ navigation, route}: Props) {
    const { documentId } = route.params;
    const [document, setDocument] = useState<LocalDocument | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [initialPage, setInitialPage] = useState(1);
    const [pageCount, setPageCount] = useState(0);

    useEffect(() => {
        getAllDocuments().then(async (documents) => {
            const found = documents.find((item) => item.id === documentId);
            const localPosition = await getLocalReadingPosition(documentId);
            if (localPosition) {
            setInitialPage(localPosition.pageNumber);
            } else {
            try {
                const apiPosition = await getApiReadingPosition(documentId);

                if (apiPosition) {
                setInitialPage(apiPosition.pageNumber);

                await saveLocalReadingPosition(documentId, {
                    pageNumber: apiPosition.pageNumber,
                    progressPercent: apiPosition.progressPercent,
                    readingMode: apiPosition.readingMode,
                    zoomScale: apiPosition.zoomScale,
                });
                }
            } catch (error) {
                console.warn("Could not restore API position:", error);
            }
            }

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
            page={initialPage}
            style={styles.pdf}
            onLoadComplete={(totalPages) => {
                setPageCount(totalPages);
            }}
            onPageChanged={(page, totalPages) => {
                const position = {
                pageNumber: page,
                progressPercent: (page / totalPages) * 100,
                readingMode: "book" as const,
                };

                saveLocalReadingPosition(documentId, position)
                .then((savedPosition) => {
                    const { id, documentId: _, updatedAt, ...apiPosition } = savedPosition;

                    return saveApiReadingPosition(documentId, apiPosition);
                })
                .catch((error) => {
                    console.warn("Could not save reading position:", error);
                });
            }}
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