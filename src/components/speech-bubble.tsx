import React, { useState } from 'react';
import { type LayoutChangeEvent, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  message: string;
  tailAlign?: 'center' | 'right';
  tailDirection?: 'bottom' | 'right';
};

export function SpeechBubble({ message, tailAlign = 'center', tailDirection = 'bottom' }: Props) {
  const theme = useTheme();
  const [bubbleWidth, setBubbleWidth] = useState(0);
  const onLayout = (event: LayoutChangeEvent) => {
    setBubbleWidth(event.nativeEvent.layout.width);
  };

  return (
    <View
      onLayout={onLayout}
      style={{
        backgroundColor: '#fffdf7',
        borderWidth: 2,
        borderColor: theme.accent,
        paddingHorizontal: 10,
        paddingVertical: 7,
        maxWidth: 190,
      }}>
      <ThemedText style={{ fontSize: 11, color: '#1f2630', fontWeight: '800', letterSpacing: 0.2 }}>{message}</ThemedText>
      <View
        style={{
          position: 'absolute',
          ...(tailDirection === 'right'
            ? {
                right: -10,
                bottom: 10,
                borderTopWidth: 8,
                borderBottomWidth: 8,
                borderLeftWidth: 10,
                borderTopColor: 'transparent',
                borderBottomColor: 'transparent',
                borderLeftColor: theme.accent,
              }
            : {
                bottom: -10,
                ...(tailAlign === 'right'
                  ? { right: 16 }
                  : { left: Math.max(0, bubbleWidth / 2 - 8) }),
                borderLeftWidth: 8,
                borderRightWidth: 8,
                borderTopWidth: 10,
                borderLeftColor: 'transparent',
                borderRightColor: 'transparent',
                borderTopColor: theme.accent,
              }),
          width: 0,
          height: 0,
        }}
      />
      <View
        style={{
          position: 'absolute',
          ...(tailDirection === 'right'
            ? {
                right: -7,
                bottom: 11,
                borderTopWidth: 7,
                borderBottomWidth: 7,
                borderLeftWidth: 8,
                borderTopColor: 'transparent',
                borderBottomColor: 'transparent',
                borderLeftColor: '#fffdf7',
              }
            : {
                bottom: -7,
                ...(tailAlign === 'right'
                  ? { right: 17 }
                  : { left: Math.max(0, bubbleWidth / 2 - 7) }),
                borderLeftWidth: 7,
                borderRightWidth: 7,
                borderTopWidth: 8,
                borderLeftColor: 'transparent',
                borderRightColor: 'transparent',
                borderTopColor: '#fffdf7',
              }),
          width: 0,
          height: 0,
        }}
      />
    </View>
  );
}
