import { Pressable, View, Text, StyleSheet, Switch } from "react-native";
import { useTheme } from "../../../shared/theme/ThemeContext";
import { getPreferredReadingMode, savePreferredReadingMode, getTapToChangePage, saveTapToChangePage, type PreferredReadingMode, } from "../../../database/repositories/settingsRepository";
import { useEffect, useState } from "react";

const options: {
  value: PreferredReadingMode;
  label: string;
}[] = [
  { value: "auto", label: "Auto" },
  { value: "scroll", label: "Vertical" },
  { value: "book", label: "Book mode" },
];

export default function SettingsScreen() {
  const { mode, colors, toggleMode } = useTheme();
  const [tapToChangePage, setTapToChangePage] = useState(false);
  const [readMode, setMode] = useState<PreferredReadingMode>("auto");

  useEffect(() => {
    Promise.all([
      getPreferredReadingMode(),
      getTapToChangePage(),
    ]).then(([readingMode, enabled]) => {
      setMode(readingMode);
      setTapToChangePage(enabled);
    });
  }, []);

  async function handleModeChange(nextMode: PreferredReadingMode) {
    setMode(nextMode);
    await savePreferredReadingMode(nextMode);
  }

  async function handleSinglePageChange(enabled: boolean) {
    setTapToChangePage(enabled);
    await saveTapToChangePage(enabled);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }, ]}>
      <Text style={[styles.title, { color: colors.text }]}>
        Preferred reading mode
      </Text>
      <View style={[styles.modeGroup, { backgroundColor: colors.surface },]}>
        {options.map((option) => {
          const selected = readMode === option.value;
          return (
            <Pressable
              key={option.value}
              style={[
                styles.option,
                selected && styles.selectedOption,
              ]}
              onPress={() => handleModeChange(option.value)}
              accessibilityRole="radio"
              accessibilityState={{
                selected,
              }}
            >
              <Text
                style={[
                  styles.optionText,
                  { color: selected ? "#ffffff" : colors.text },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={[styles.row, { backgroundColor: colors.surface }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          Enable tap to change page (Book mode)
        </Text>

        <Switch
          value={tapToChangePage}
          onValueChange={async (enabled) => {
            setTapToChangePage(enabled);
            await saveTapToChangePage(enabled);
          }}
        />
      </View>
      <View
        style={[
          styles.row,
          { backgroundColor: colors.surface },
        ]}
      >
        <Text style={[styles.title, { color: colors.text }]}>
          Toggle Dark Mode
        </Text>

        <Switch
          value={mode === "dark"}
          onValueChange={toggleMode}
          trackColor={{
            false: "#767577",
            true: "#81b0ff",
          }}
          thumbColor={mode === "dark" ? "#ffffff" : "#f4f3f4"}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  heading: {
    marginBottom: 12,
    fontSize: 20,
    fontWeight: "700",
  },
  modeGroup: {
    width: "100%",
    padding: 4,
    marginBottom: 16,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
  },

  option: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 8,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  selectedOption: {
    backgroundColor: "#4f8cff",
  },

  optionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  disabledOption: {
  opacity: 0.45,
  },

  disabledOptionText: {
    color: "#888888",
  },
    checkmark: {
    color: "#4f8cff",
    fontWeight: "600",
  },
    row: {
    minHeight: 56,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
  },
});