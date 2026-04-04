import { Image } from 'expo-image';
import React from 'react';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { getNomadTypeConfig } from '@/constants/nomad-types';
import type { NomadType } from '@/types/api';

type Props = {
  type: NomadType | null;
  size: number;
  animated?: boolean;
};

export function CharacterAvatar({ type, size, animated = false }: Props) {
  const config = getNomadTypeConfig(type);

  if (!config) {
    return (
      <View
        style={{
          width: size,
          height: size,
          backgroundColor: '#e8e5e0',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <ThemedText style={{ fontSize: size * 0.4, fontWeight: 'bold' }}>?</ThemedText>
      </View>
    );
  }

  const source = animated ? config.avatarGif : config.avatar;
  const isSmall = size <= 64;
  const iconSource = animated ? config.iconGif : config.icon;

  return (
    <Image
      source={isSmall ? iconSource : source}
      style={{ width: size, height: size }}
      contentFit="contain"
      cachePolicy="memory-disk"
    />
  );
}
