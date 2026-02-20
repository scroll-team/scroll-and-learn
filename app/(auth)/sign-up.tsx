import { useState } from "react";
import {
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, router } from "expo-router";
import { Typography, Button, Input } from "@/components/ui";
import { signUpWithEmail } from "@/services/auth";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function SignUpScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSignUp() {
    if (!email.trim() || !password) {
      setError("Please fill in all required fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: authError } = await signUpWithEmail(
      email.trim().toLowerCase(),
      password,
      displayName.trim() || undefined,
    );

    if (authError) {
      setError(authError.message);
    } else if (data.user && !data.session) {
      Alert.alert(
        "Check your email",
        "We sent you a confirmation link. Please verify your email to continue.",
        [{ text: "OK", onPress: () => router.replace("/(auth)/sign-in") }],
      );
    }
    setLoading(false);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? "#0C0A09" : "#FAFAF9" }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-8 items-center">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-teal-600">
              <IconSymbol name="book.fill" size={32} color="#FFFFFF" />
            </View>
            <Typography variant="display" className="text-center">
              Create Account
            </Typography>
            <Typography
              variant="bodySmall"
              className="mt-2 text-center"
            >
              Start turning any PDF into bite-sized lessons
            </Typography>
          </View>

          <View className="gap-4">
            <Input
              label="Name"
              placeholder="What should we call you?"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
            />

            <Input
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
            />

            <View>
              <Input
                label="Password"
                placeholder="At least 6 characters"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[38px]"
                hitSlop={8}
              >
                <IconSymbol
                  name={showPassword ? "eye.slash.fill" : "eye.fill"}
                  size={20}
                  color="#78716C"
                />
              </Pressable>
            </View>

            <Input
              label="Confirm Password"
              placeholder="Type your password again"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              textContentType="newPassword"
            />

            {error && (
            <View className="rounded-lg bg-red-50 px-4 py-3 dark:bg-red-950">
              <Typography variant="bodySmall" className="text-red-600 dark:text-red-400">
                  {error}
                </Typography>
              </View>
            )}

            <Button loading={loading} onPress={handleSignUp} className="mt-2">
              Create Account
            </Button>
          </View>

          <View className="mt-8 mb-4 flex-row items-center justify-center gap-1">
            <Typography variant="bodySmall">
              Already have an account?
            </Typography>
            <Link href="/(auth)/sign-in" asChild>
              <Pressable hitSlop={8}>
                <Typography
                  variant="bodySmall"
                  className="font-inter-semibold text-teal-600 dark:text-teal-400"
                >
                  Sign In
                </Typography>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
