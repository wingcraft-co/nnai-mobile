import { View, type ViewProps } from 'react-native';

import { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemeColor;
  className?: string;
};

export function ThemedView({
  style,
  lightColor,
  darkColor,
  type,
  className,
  ...otherProps
}: ThemedViewProps) {
  const theme = useTheme();

  return (
    <View
      className={cn(className)}
      style={[{ backgroundColor: theme[type ?? 'background'] }, style]}
      {...otherProps}
    />
  );
}
