import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { RootStackParamList } from "./src/app/navigation/types";
import LibraryScreen from "./src/features/library/screens/LibraryScreen";
import ReaderScreen from "./src/features/reader/screens/ReaderScreen";
import BookmarkScreen from "./src/features/bookmarks/screens/BookmarkScreen";
import SettingsScreen from "./src/features/settings/screens/SettingsScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator initialRouteName="Library">
        <Stack.Screen
          name="Library"
          component={LibraryScreen}
          options={{ title: "Library" }}
        />
        <Stack.Screen
          name="Reader"
          component={ReaderScreen}
          options={{ title: "Reader" }}
        />
        <Stack.Screen
          name="Bookmarks"
          component={BookmarkScreen}
          options={{ title: "Bookmarks" }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: "Settings" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}