import { Image } from 'expo-image';
import React from 'react';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EarthAssets } from '@/constants/nomad-types';
import { useTheme } from '@/hooks/use-theme';

export function LoadingScreen() {
  const theme = useTheme();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.background,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
      }}>
      <Image
        source={EarthAssets.fullGif}
        style={{ width: 120, height: 120 }}
        contentFit="contain"
        cachePolicy="memory-disk"
      />
      <ThemedText style={{ fontSize: 12, color: theme.textSecondary, fontFamily: 'monospace' }}>
        loading...
      </ThemedText>
    </View>
  );
}
