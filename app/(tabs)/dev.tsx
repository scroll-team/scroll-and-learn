import { useState } from "react";
import { ScrollView, View, Text, Pressable } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useColorScheme } from "@/hooks/use-color-scheme";

import {
  Typography,
  Button,
  Card,
  PressableCard,
  Input,
  Badge,
  ProgressBar,
  IconButton,
  Chip,
  EmptyState,
  Skeleton,
  SkeletonCard,
} from "@/components/ui";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="gap-3">
      <Typography variant="overline">{title}</Typography>
      {children}
    </View>
  );
}

type ThemeOption = "system" | "light" | "dark";

function ThemeSwitcher() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const [selected, setSelected] = useState<ThemeOption>("system");

  const options: { value: ThemeOption; label: string; icon: string }[] = [
    { value: "light", label: "Light", icon: "light-mode" },
    { value: "dark", label: "Dark", icon: "dark-mode" },
    { value: "system", label: "System", icon: "settings-brightness" },
  ];

  const handleSelect = (value: ThemeOption) => {
    setSelected(value);
    setColorScheme(value);
  };

  return (
    <View className="flex-row gap-2">
      {options.map((option) => {
        const isActive = selected === option.value;
        return (
          <Pressable
            key={option.value}
            onPress={() => handleSelect(option.value)}
            className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl py-3 ${
              isActive
                ? "bg-teal-600"
                : "bg-stone-200 dark:bg-stone-800"
            }`}
          >
            <MaterialIcons
              name={option.icon as any}
              size={18}
              color={isActive ? "#FFFFFF" : colorScheme === "dark" ? "#A8A29E" : "#78716C"}
            />
            <Text
              className={`text-sm font-semibold ${
                isActive
                  ? "text-white"
                  : "text-stone-600 dark:text-stone-400"
              }`}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function DevScreen() {
  const [selectedChip, setSelectedChip] = useState("easy");
  const [inputValue, setInputValue] = useState("");
  const [loadingBtn, setLoadingBtn] = useState(false);

  return (
    <View className="flex-1 bg-stone-50 dark:bg-stone-950">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 32, paddingTop: 60 }}
      >
        <View>
          <Typography variant="h1">Design System</Typography>
          <Typography variant="bodySmall" className="mt-1">
            Component preview — remove this tab before shipping.
          </Typography>
        </View>

        {/* Theme Switcher */}
        <Section title="Appearance">
          <ThemeSwitcher />
        </Section>

        {/* Typography */}
        <Section title="Typography">
          <Typography variant="display">Display</Typography>
          <Typography variant="h1">Heading 1</Typography>
          <Typography variant="h2">Heading 2</Typography>
          <Typography variant="h3">Heading 3</Typography>
          <Typography variant="body">
            Body text — the default for paragraphs and descriptions.
          </Typography>
          <Typography variant="bodySmall">
            Body small — secondary text like timestamps.
          </Typography>
          <Typography variant="caption">Caption — metadata</Typography>
          <Typography variant="overline">Overline — labels</Typography>
        </Section>

        {/* Buttons */}
        <Section title="Buttons">
          <View className="gap-3">
            <Button onPress={() => {}}>Primary Button</Button>
            <Button variant="secondary" onPress={() => {}}>
              Secondary Button
            </Button>
            <Button variant="ghost" onPress={() => {}}>
              Ghost Button
            </Button>
            <Button variant="destructive" onPress={() => {}}>
              Destructive Button
            </Button>
          </View>

          <Text className="mt-2 text-xs text-stone-500">Sizes</Text>
          <View className="flex-row items-center gap-3">
            <Button size="sm" onPress={() => {}}>
              Small
            </Button>
            <Button size="md" onPress={() => {}}>
              Medium
            </Button>
            <Button size="lg" onPress={() => {}}>
              Large
            </Button>
          </View>

          <Text className="mt-2 text-xs text-stone-500">States</Text>
          <View className="flex-row items-center gap-3">
            <Button disabled onPress={() => {}}>
              Disabled
            </Button>
            <Button
              loading={loadingBtn}
              onPress={() => {
                setLoadingBtn(true);
                setTimeout(() => setLoadingBtn(false), 2000);
              }}
            >
              {loadingBtn ? "Loading" : "Tap to load"}
            </Button>
          </View>
        </Section>

        {/* Cards */}
        <Section title="Cards">
          <Card>
            <Typography variant="h3">Static Card</Typography>
            <Typography variant="bodySmall" className="mt-1">
              Used for content display.
            </Typography>
          </Card>

          <PressableCard onPress={() => {}}>
            <Typography variant="h3">Pressable Card</Typography>
            <Typography variant="bodySmall" className="mt-1">
              Tap me — scales on press.
            </Typography>
          </PressableCard>
        </Section>

        {/* Inputs */}
        <Section title="Inputs">
          <Input
            label="Email"
            placeholder="you@example.com"
            value={inputValue}
            onChangeText={setInputValue}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input
            label="Password"
            placeholder="Enter password"
            secureTextEntry
            helperText="Must be at least 8 characters"
          />
          <Input
            label="With Error"
            placeholder="Invalid input"
            value="bad value"
            error="This field is required"
          />
        </Section>

        {/* Badges */}
        <Section title="Badges">
          <View className="flex-row flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="brand">Processing</Badge>
            <Badge variant="success">Ready</Badge>
            <Badge variant="warning">Pending</Badge>
            <Badge variant="error">Error</Badge>
          </View>
        </Section>

        {/* Progress Bars */}
        <Section title="Progress Bars">
          <View className="gap-3">
            <View className="gap-1">
              <Text className="text-xs text-stone-500">Brand (30%)</Text>
              <ProgressBar progress={0.3} />
            </View>
            <View className="gap-1">
              <Text className="text-xs text-stone-500">Reward (65%)</Text>
              <ProgressBar progress={0.65} variant="reward" />
            </View>
            <View className="gap-1">
              <Text className="text-xs text-stone-500">Success (100%)</Text>
              <ProgressBar progress={1} variant="success" />
            </View>
            <View className="gap-1">
              <Text className="text-xs text-stone-500">Energy (50%)</Text>
              <ProgressBar progress={0.5} variant="energy" />
            </View>
          </View>
        </Section>

        {/* Icon Buttons */}
        <Section title="Icon Buttons">
          <View className="flex-row items-center gap-3">
            <IconButton onPress={() => {}}>
              <MaterialIcons name="add" size={20} color="#0D9488" />
            </IconButton>
            <IconButton variant="filled" onPress={() => {}}>
              <MaterialIcons name="edit" size={20} color="#0D9488" />
            </IconButton>
            <IconButton size="lg" variant="filled" onPress={() => {}}>
              <MaterialIcons name="upload-file" size={24} color="#0D9488" />
            </IconButton>
            <IconButton disabled onPress={() => {}}>
              <MaterialIcons name="delete" size={20} color="#A8A29E" />
            </IconButton>
          </View>
        </Section>

        {/* Chips */}
        <Section title="Chips">
          <View className="flex-row flex-wrap gap-2">
            {["easy", "medium", "hard"].map((level) => (
              <Chip
                key={level}
                label={level.charAt(0).toUpperCase() + level.slice(1)}
                selected={selectedChip === level}
                onPress={() => setSelectedChip(level)}
              />
            ))}
          </View>
        </Section>

        {/* Empty State */}
        <Section title="Empty State">
          <Card className="py-8">
            <EmptyState
              icon={
                <View className="h-16 w-16 items-center justify-center rounded-2xl bg-teal-50">
                  <Text className="text-3xl">📚</Text>
                </View>
              }
              title="No documents yet"
              description="Upload a PDF to start generating quizzes and study content."
              actionLabel="Upload PDF"
              onAction={() => {}}
            />
          </Card>
        </Section>

        {/* Skeleton */}
        <Section title="Skeleton Loading">
          <View className="gap-3">
            <Skeleton width="70%" height={20} />
            <Skeleton width="100%" height={12} />
            <Skeleton width="50%" height={12} />
          </View>
          <SkeletonCard className="mt-2" />
        </Section>
      </ScrollView>
    </View>
  );
}
