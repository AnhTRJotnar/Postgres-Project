import Pdf from "react-native-pdf";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View,  useWindowDimensions, } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import type { RootStackParamList } from "../../../app/navigation/types";
import type { LocalDocument } from "../../../shared/types/document";
import { getAllDocuments, updateDocument, } from "../../../database/repositories/documentRepository";
import { getReadingPosition as getLocalReadingPosition, saveReadingPosition as saveLocalReadingPosition, } from "../../../database/repositories/readingPositionRepository";
import { getReadingPosition as getApiReadingPosition, saveReadingPosition as saveApiReadingPosition, } from "../../../shared/api/readingPositionsApi";
import { addBookmark as addLocalBookmark, } from "../../../database/repositories/bookmarkRepository";
import { saveBookmark as saveApiBookmark, } from "../../../shared/api/bookmarksApi";
import type { ReadingMode } from "@kindle-pdf-reader/shared";
import { useTheme } from "../../../shared/theme/ThemeContext";
import { getPreferredReadingMode, getTapToChangePage, type PreferredReadingMode, } from "../../../database/repositories/settingsRepository";

type Props = NativeStackScreenProps<RootStackParamList, "Reader">;

export default function ReaderScreen({ navigation, route}: Props) {
    const { documentId, pageNumber, reloadKey } = route.params;
    const [document, setDocument] = useState<LocalDocument | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [initialPage, setInitialPage] = useState(1);
    const [pageCount, setPageCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(initialPage);
    const { width, height } = useWindowDimensions();
    const pdfRef = useRef<{ setPage: (page: number) => void } | null>(null);
    const [pageIndicatorVisible, setPageIndicatorVisible] = useState(false);
    const pageIndicatorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { colors } = useTheme();
    const [preferredMode, setPreferredMode] = useState<PreferredReadingMode>("auto");
    const [tapToChangePage, setTapToChangePage] = useState(false);

    const orientationMode: ReadingMode = width > height ? "book" : "scroll";
    const readingMode: ReadingMode = preferredMode === "auto" ? orientationMode : preferredMode;   

    const [controlsVisible, setControlsVisible] = useState(false);
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showPageIndicator = useCallback(() => {
    setPageIndicatorVisible(true);

    if (pageIndicatorTimer.current) {
        clearTimeout(pageIndicatorTimer.current);
    }

    pageIndicatorTimer.current = setTimeout(() => {
        setPageIndicatorVisible(false);
    }, 2000);
    }, []);

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
            headerShown: false,
        });
    }, [navigation]);

    useEffect(() => {
        return () => {
            if (pageIndicatorTimer.current) {
                clearTimeout(pageIndicatorTimer.current);
            }
        };
    }, []);
    useEffect(() => {
        Promise.all([
            getPreferredReadingMode(),
            getTapToChangePage(),
        ]).then(([mode, tapToChangePage]) => {
            setPreferredMode(mode);
            setTapToChangePage(tapToChangePage);
        }).catch((error) => {
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

    function goToPage(page: number) {
        const nextPage = Math.max(1, Math.min(pageCount, page));

        if (nextPage !== currentPage) {
            pdfRef.current?.setPage(nextPage);
        }
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {controlsVisible && (
                <SafeAreaView edges={["top"]} style={[styles.topBar, { backgroundColor: colors.surface }]}>
                    <View style={styles.toolbar}>
                        <Pressable style={styles.iconButton} onPress={() => navigation.goBack()} accessibilityLabel="Go back">
                            <Ionicons name="arrow-back" size={23} color={colors.text}/>
                        </Pressable>

                        <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>
                            {document.title}
                        </Text>

                        <Pressable style={styles.iconButton} onPress={handleAddBookmark} accessibilityLabel="Add bookmark">
                            <Ionicons name="bookmark-outline" size={23} color={colors.text}/>
                        </Pressable>

                        <Pressable style={styles.iconButton} onPress={() => navigation.navigate("Bookmarks", { documentId })} accessibilityLabel="Open bookmarks">
                            <Ionicons name="bookmarks-outline" size={23} color={colors.text}/>
                        </Pressable>
                    </View>
                </SafeAreaView>
            )}

            <View style={styles.readerContent}>
                <Pdf
                    ref={pdfRef}
                    key={`${documentId}-${readingMode}-${reloadKey ?? 0}`}
                    source={{ uri: document.localUri }}
                    page={initialPage}
                    style={[styles.pdf, { backgroundColor: colors.background },]}
                    horizontal={readingMode === "book"}
                    enablePaging={readingMode === "book"}
                    onPageSingleTap={toggleControls}
                    onLoadComplete={async (totalPages) => {
                        setPageCount(totalPages);

                        try {
                            await updateDocument(documentId, { pageCount: totalPages,});
                        } catch (error) {
                            console.warn("Could not update page count:", error);
                        }
                    }}
                    onPageChanged={(page, totalPages) => {
                        setCurrentPage(page);
                        showPageIndicator();

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
                {pageIndicatorVisible && (
                <View
                    pointerEvents="none"
                    style={[
                    styles.pageIndicator,
                    { backgroundColor: colors.surface },
                    ]}
                >
                    <Text style={[styles.pageIndicatorText, { color: colors.text }]}>
                    {currentPage} / {pageCount}
                    </Text>
                </View>
                )}

                {readingMode === "book" && tapToChangePage && (
                <>
                    <Pressable
                    style={[styles.pageTapZone, styles.leftPageTapZone]}
                    disabled={currentPage <= 1}
                    onPress={() => {
                        goToPage(currentPage - 1);
                    }}
                    accessibilityLabel="Previous page"
                    />

                    <Pressable
                    style={[styles.pageTapZone, styles.rightPageTapZone]}
                    disabled={currentPage >= pageCount}
                    onPress={() => {
                        goToPage(currentPage + 1);
                    }}
                    accessibilityLabel="Next page"
                    />
                </>
                )}                
            </View>


        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    readerContent: {
        flex: 1,
        position: "relative",
    },
    center: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    topBar: {
        width: "100%",
    },

    toolbar: {
        minHeight: 56,
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,

    },

    title: {
        flex: 1,
        marginRight: 8,
        fontSize: 16,
        fontWeight: "600",
    },

    iconButton: {
        width: 44,
        height: 44,
        marginLeft: 4,
        alignItems: "center",
        justifyContent: "center",
    },
    pdf: {
        flex: 1,
        width: "100%",
    },
    pageTapZone: {
        position: "absolute",
        top: 0,
        bottom: 0,
        width: "25%",
    },

    leftPageTapZone: {
        left: 0,
    },

    rightPageTapZone: {
        right: 0,   
    },
    pageIndicator: {
        position: "absolute",
        bottom: 24,
        alignSelf: "center",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        opacity: 0.9,
    },

    pageIndicatorText: {
        fontSize: 14,
        fontWeight: "600",
    },
});