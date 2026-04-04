import React from 'react';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  message: string;
};

export function SpeechBubble({ message }: Props) {
  const theme = useTheme();

  return (
    <View
      style={{
        backgroundColor: theme.backgroundElement,
        borderWidth: 1,
        borderColor: theme.border,
        paddingHorizontal: 10,
        paddingVertical: 6,
        maxWidth: 180,
      }}>
      <ThemedText style={{ fontSize: 11, color: theme.text }}>{message}</ThemedText>
      <View
        style={{
          position: 'absolute',
          bottom: -6,
          right: 12,
          width: 0,
          height: 0,
          borderLeftWidth: 6,
          borderRightWidth: 6,
          borderTopWidth: 6,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: theme.border,
        }}
      />
    </View>
  );
}
