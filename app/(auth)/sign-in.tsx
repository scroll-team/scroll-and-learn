import { useState } from "react";
import { View, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { Typography, Button, Input } from "@/components/ui";
import { signInWithEmail } from "@/services/auth";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function SignInScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSignIn() {
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    setError(null);

    const { error: authError } = await signInWithEmail(
      email.trim().toLowerCase(),
      password,
    );

    if (authError) {
      setError(authError.message);
    }
    setLoading(false);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? "#0C0A09" : "#FAFAF9" }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24 }}
      >
        <View className="mb-10 items-center">
          <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-teal-600">
            <IconSymbol name="book.fill" size={32} color="#FFFFFF" />
          </View>
          <Typography variant="display" className="text-center">
            LearnAnything
          </Typography>
          <Typography
            variant="bodySmall"
            className="mt-2 text-center"
          >
            Sign in to continue learning
          </Typography>
        </View>

        <View className="gap-4">
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
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password"
              textContentType="password"
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

          {error && (
            <View className="rounded-lg bg-red-50 px-4 py-3 dark:bg-red-950">
              <Typography variant="bodySmall" className="text-red-600 dark:text-red-400">
                {error}
              </Typography>
            </View>
          )}

          <Button loading={loading} onPress={handleSignIn} className="mt-2">
            Sign In
          </Button>
        </View>

        <View className="mt-8 flex-row items-center justify-center gap-1">
          <Typography variant="bodySmall">
            Don't have an account?
          </Typography>
          <Link href="/(auth)/sign-up" asChild>
            <Pressable hitSlop={8}>
              <Typography
                variant="bodySmall"
                className="font-inter-semibold text-teal-600 dark:text-teal-400"
              >
                Sign Up
              </Typography>
            </Pressable>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
