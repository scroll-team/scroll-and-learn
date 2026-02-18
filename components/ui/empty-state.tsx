import { View } from "react-native";
import { Typography } from "./typography";
import { Button } from "./button";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = "",
}: EmptyStateProps) {
  return (
    <View className={`items-center gap-3 px-8 ${className}`}>
      <View className="mb-1">{icon}</View>

      <Typography variant="h3" className="text-center">
        {title}
      </Typography>

      <Typography variant="bodySmall" className="text-center">
        {description}
      </Typography>

      {actionLabel && onAction && (
        <View className="mt-2">
          <Button size="md" onPress={onAction}>
            {actionLabel}
          </Button>
        </View>
      )}
    </View>
  );
}
