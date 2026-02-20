import { View, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Typography, Button } from "@/components/ui";
import { useAuth } from "@/providers/auth-provider";
import { signOut } from "@/services/auth";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function ProfileScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user, profile } = useAuth();

  const displayName = profile?.displayName || user?.email?.split("@")[0] || "User";
  const initial = displayName.charAt(0).toUpperCase();

  function handleSignOut() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => signOut(),
      },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? "#0C0A09" : "#FAFAF9" }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingTop: 16 }}
      >
        <Typography variant="h1">Profile</Typography>
        <Typography variant="bodySmall" className="mt-1">
          Your account and settings.
        </Typography>

        <View className="mt-8 items-center gap-3">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-teal-600">
            <Typography variant="display" className="text-white">
              {initial}
            </Typography>
          </View>
          <Typography variant="h2">{displayName}</Typography>
          <Typography variant="bodySmall">{user?.email}</Typography>
        </View>

        <View className="mt-8 rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
          <View className="flex-row items-center justify-between border-b border-stone-100 pb-4 dark:border-stone-800">
            <Typography variant="body">Email</Typography>
            <Typography variant="bodySmall">{user?.email}</Typography>
          </View>
          <View className="flex-row items-center justify-between border-b border-stone-100 py-4 dark:border-stone-800">
            <Typography variant="body">Provider</Typography>
            <Typography variant="bodySmall">
              {user?.app_metadata?.provider === "google" ? "Google" : "Email"}
            </Typography>
          </View>
          <View className="flex-row items-center justify-between pt-4">
            <Typography variant="body">Member since</Typography>
            <Typography variant="bodySmall">
              {user?.created_at
                ? new Date(user.created_at).toLocaleDateString()
                : "—"}
            </Typography>
          </View>
        </View>

        <View style={{ marginTop: "auto", paddingBottom: 32 }}>
          <Button variant="destructive" onPress={handleSignOut}>
            Sign Out
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
