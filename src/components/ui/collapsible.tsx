import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PropsWithChildren, useState } from 'react';
import { Pressable } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';

export function Collapsible({ children, title }: PropsWithChildren & { title: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const theme = useTheme();

  return (
    <ThemedView>
      <Pressable
        className="flex-row items-center gap-2"
        style={({ pressed }) => (pressed ? { opacity: 0.7 } : null)}
        onPress={() => setIsOpen((value) => !value)}>
        <ThemedView type="backgroundElement" className="w-6 h-6 rounded-xl items-center justify-center">
          <MaterialCommunityIcons
            name="chevron-right"
            size={14}
            color={theme.text}
            style={{ transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}
          />
        </ThemedView>

        <ThemedText type="small">{title}</ThemedText>
      </Pressable>
      {isOpen && (
        <Animated.View entering={FadeIn.duration(200)}>
          <ThemedView type="backgroundElement" className="mt-4 rounded-2xl ml-6 p-6">
            {children}
          </ThemedView>
        </Animated.View>
      )}
    </ThemedView>
  );
}
