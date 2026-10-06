import { View, Text, Button, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../../app/navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Reader">;

export default function ReaderScreen({ navigation, route}: Props) {
    const { documentId } = route.params;

    return (
        <View style={styles.container}>
        <Text style={styles.title}>Reader for document: {documentId}</Text>
        <Button
            title="Bookmarks"
            onPress={() => navigation.navigate("Bookmarks", { documentId })}
        />
        </View>
    );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  title: { fontSize: 18 },
});