import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Button, StyleSheet, Text, View,  useWindowDimensions, } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../../app/navigation/types";
import type { LocalDocument } from "../../../shared/types/document";
import { getAllDocuments } from "../../../database/repositories/documentRepository";
import Pdf from "react-native-pdf";
import { getReadingPosition as getLocalReadingPosition, saveReadingPosition as saveLocalReadingPosition, } from "../../../database/repositories/readingPositionRepository";
import { getReadingPosition as getApiReadingPosition, saveReadingPosition as saveApiReadingPosition, } from "../../../shared/api/readingPositionsApi";
import { addBookmark as addLocalBookmark, } from "../../../database/repositories/bookmarkRepository";
import { saveBookmark as saveApiBookmark, } from "../../../shared/api/bookmarksApi";
import type { ReadingMode } from "@kindle-pdf-reader/shared";
import { useTheme } from "../../../shared/theme/ThemeContext";
import {
  getPreferredReadingMode,
  type PreferredReadingMode,
} from "../../../database/repositories/settingsRepository";
import { StatusBar } from "expo-status-bar";

type Props = NativeStackScreenProps<RootStackParamList, "Reader">;

export default function ReaderScreen({ navigation, route}: Props) {
    const { documentId, pageNumber, reloadKey } = route.params;
    const [document, setDocument] = useState<LocalDocument | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [initialPage, setInitialPage] = useState(1);
    const [pageCount, setPageCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(initialPage);
    const { width, height } = useWindowDimensions();
 
    const { colors, mode } = useTheme();
    const [preferredMode, setPreferredMode] = useState<PreferredReadingMode>("auto");
    
    const orientationMode: ReadingMode = width > height ? "book" : "scroll";
    const readingMode: ReadingMode = preferredMode === "auto" ? orientationMode : preferredMode;   

    const [controlsVisible, setControlsVisible] = useState(false);
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const revealControls = useCallback(() => {
    setControlsVisible(true);

    if (hideTimer.current) {
        clearTimeout(hideTimer.current);
    }

    hideTimer.current = setTimeout(() => {
        setControlsVisible(false);
    }, 4000);
    }, []);

    const toggleControls = useCallback(() => {
    if (controlsVisible) {
        setControlsVisible(false);

        if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        }
    } else {
        revealControls();
    }
    }, [controlsVisible, revealControls]);

    useEffect(() => {
        navigation.setOptions({
            headerShown: controlsVisible,
        });

        return () => {
            navigation.setOptions({ headerShown: true });
        };
    }, [navigation, controlsVisible]);
    useEffect(() => {
        getPreferredReadingMode()
            .then(setPreferredMode)
            .catch((error) => {
            console.warn("Could not load preferred reading mode:", error);
        });
        getAllDocuments().then(async (documents) => {
            const found = documents.find((item) => item.id === documentId);
            if (pageNumber) {
                setInitialPage(pageNumber);
                setCurrentPage(pageNumber);
            } else {
                const localPosition = await getLocalReadingPosition(documentId);

                if (localPosition) {
                    setInitialPage(localPosition.pageNumber);
                    setCurrentPage(localPosition.pageNumber);
                } else {
                    try {
                        const apiPosition = await getApiReadingPosition(documentId);

                        if (apiPosition) {
                            setInitialPage(apiPosition.pageNumber);
                            setCurrentPage(apiPosition.pageNumber);
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
            }
            if (!found) {
                setError("Document not found");
                return;
            }
            setDocument(found);
        }).catch(() => setError("Failed to load document"));
    }, [documentId, pageNumber, reloadKey]);

    if (error) {
        return (
            <View style={[styles.center, { backgroundColor: colors.background }]}>
                <Text style={{ color: colors.text }}>{error}</Text>
            </View>
        );
    }

    if (!document) {
        return (
            <View style={[styles.center, { backgroundColor: colors.background }]}>
                <ActivityIndicator color={colors.text} />
            </View>
        );
    }

    async function handleAddBookmark() {
        if (pageCount === 0) return;

        try {
            const bookmark = await addLocalBookmark(documentId, {
                pageNumber: currentPage,
                readingMode,
            });

            saveApiBookmark(documentId, bookmark).catch((error) => {
                console.warn("Bookmark will sync later: ", error);
            });

            Alert.alert("Bookmark added", `Page ${currentPage}`);
        } catch (error) {
            Alert.alert("Could not save bookmark", error instanceof Error ? error.message : "Something went wrong.");
        }
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar hidden={!controlsVisible} style={mode === "dark" ? "light" : "dark"}/>
            <View style={[ styles.toolbar, { backgroundColor: colors.surface },]}>
                <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>
                    {document.title}
                </Text>

                <Button title="Bookmark" onPress={handleAddBookmark} />

                <Button
                    title="Bookmarks"
                    onPress={() =>
                    navigation.navigate("Bookmarks", { documentId })
                    }
                />
            </View>

            <Pdf
                key={`${documentId}-${readingMode}-${reloadKey ?? 0}`}
                source={{ uri: document.localUri }}
                page={initialPage}
                style={[styles.pdf, { backgroundColor: colors.background },]}
                horizontal={readingMode === "book"}
                enablePaging={readingMode === "book"}
                onPageSingleTap={toggleControls}
                onLoadComplete={(totalPages) => {
                    setPageCount(totalPages);
                }}
                onPageChanged={(page, totalPages) => {
                    setCurrentPage(page);

                    const position = {
                        pageNumber: page,
                        progressPercent: (page / totalPages) * 100,
                        readingMode,
                    };

                    saveLocalReadingPosition(documentId, position)
                    .then((savedPosition) => {
                        const { id, documentId: _documentId, updatedAt, ...apiPosition } = savedPosition;

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