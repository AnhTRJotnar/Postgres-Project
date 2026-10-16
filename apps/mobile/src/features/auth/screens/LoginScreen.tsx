import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, } from "react-native";
import { useTheme } from "../../../shared/theme/ThemeContext";

export default function LoginScreen() {
    const { colors } = useTheme();

    return (
        <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <Text style={[styles.heading, { color: colors.text }]}>
                    Welcome back
                </Text>

                <Text style={[styles.subtitle, { color: colors.muted ?? colors.text }]}>
                    Sign in to sync your library across devices.
                </Text>

                <TextInput
                    placeholder="Email"
                    placeholderTextColor={colors.text}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={[
                        styles.input,
                        {
                            color: colors.text,
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                        },
                    ]}
                />

                <TextInput
                    placeholder="Password"
                    placeholderTextColor={colors.text}
                    secureTextEntry
                    style={[
                        styles.input,
                        {
                            color: colors.text,
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                        },
                    ]}
                    />

                <Pressable style={[styles.primaryButton, { backgroundColor: "#4f8cff" }]} onPress={() => {}}>
                    <Text style={styles.primaryButtonText}>Sign in</Text>
                </Pressable>

                <Pressable style={styles.secondaryButton} onPress={() => {}}>
                    <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                        Create account
                    </Text>
                </Pressable>

                <Pressable style={styles.offlineButton} onPress={() => {}}>
                    <Text style={[styles.offlineText, { color: colors.text }]}>
                        Continue offline
                    </Text>
                </Pressable>
            </ScrollView>
        </KeyboardAvoidingView>
    )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  heading: {
    fontSize: 30,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 28,
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
    fontSize: 16,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  offlineButton: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  offlineText: {
    fontSize: 14,
    textDecorationLine: "underline",
  },
});