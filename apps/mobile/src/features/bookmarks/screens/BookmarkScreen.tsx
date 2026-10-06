import { View, Text, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../../app/navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Bookmarks">;

export default function BookmarkScreen({ route }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bookmarks for: {route.params.documentId}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18 },
});