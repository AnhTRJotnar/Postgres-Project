import { StatusBar } from "expo-status-bar";
import { DarkTheme, DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { RootStackParamList } from "./src/app/navigation/types";
import LibraryScreen from "./src/features/library/screens/LibraryScreen";
import ReaderScreen from "./src/features/reader/screens/ReaderScreen";
import BookmarkScreen from "./src/features/bookmarks/screens/BookmarkScreen";
import SettingsScreen from "./src/features/settings/screens/SettingsScreen";

import { ThemeProvider } from "./src/shared/theme/ThemeContext";
import { useTheme } from "./src/shared/theme/ThemeContext";

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigation() {
  const { mode, colors } = useTheme();
  const baseTheme = mode === "dark" ? DarkTheme : DefaultTheme;

  const navigationTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: "#4f8cff",
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: mode === "dark" ? "#444444" : "#dddddd",
      notification: "#ff453a",
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
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
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AppNavigation />
    </ThemeProvider>
  );
}