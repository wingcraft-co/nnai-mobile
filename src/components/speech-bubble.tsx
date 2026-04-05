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
        backgroundColor: 'rgba(18, 24, 32, 0.82)',
        borderWidth: 2,
        borderColor: theme.accent,
        paddingHorizontal: 10,
        paddingVertical: 7,
        maxWidth: 190,
      }}>
      <ThemedText style={{ fontSize: 11, color: '#f4f7fb', fontWeight: '700', letterSpacing: 0.2 }}>{message}</ThemedText>
      <View
        style={{
          position: 'absolute',
          bottom: -8,
          right: 12,
          width: 0,
          height: 0,
          borderLeftWidth: 7,
          borderRightWidth: 7,
          borderTopWidth: 8,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: theme.accent,
        }}
      />
    </View>
  );
}
