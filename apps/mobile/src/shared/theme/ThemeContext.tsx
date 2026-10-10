import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState } from "react";

export type ThemeMode = "light" | "dark";

const THEME_KEY = "themeMode";

const colors = {
  light: {
    background: "#ffffff",
    surface: "#f2f2f2",
    text: "#111111",
    mutedText: "#666666",
  },
  dark: {
    background: "#121212",
    surface: "#242424",
    text: "#ffffff",
    mutedText: "#aaaaaa",
  },
} as const;

type ThemeContextValue = {
    mode: ThemeMode;
    colors: (typeof colors)[ThemeMode];
    setMode: (mode: ThemeMode) => void;
    toggleMode: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [mode, setModeState] = useState<ThemeMode>("light");

    useEffect(() => {
        AsyncStorage.getItem(THEME_KEY).then((savedMode) => {
        if (savedMode === "light" || savedMode === "dark") {
            setModeState(savedMode);
        }
        });
    }, []);

    function setMode(nextMode: ThemeMode) {
        setModeState(nextMode);
        void AsyncStorage.setItem
    }

    function toggleMode() {
        setMode(mode === "light" ? "dark" : "light");
    }

    return (
        <ThemeContext.Provider
            value={{ mode, colors: colors[mode], setMode, toggleMode }}
        >
            {children}
        </ThemeContext.Provider>
    );
    
};

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}