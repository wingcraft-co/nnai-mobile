import { Image } from 'expo-image';
import React, { PropsWithChildren } from 'react';
import { ScrollView, type RefreshControlProps, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { EarthAssets } from '@/constants/nomad-types';
import { useTheme } from '@/hooks/use-theme';

type ScreenShellProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  subtitle: string;
  invertEyebrow?: boolean;
  showLogo?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
}>;

export function ScreenShell({
  children,
  eyebrow,
  title,
  subtitle,
  invertEyebrow = false,
  showLogo = false,
  refreshControl,
}: ScreenShellProps) {
  const theme = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4 gap-4"
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}>
        <View
          style={{
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border,
            borderWidth: 1,
            padding: 24,
            gap: 8,
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {showLogo ? <Image source={EarthAssets.logo} style={{ width: 24, height: 24 }} contentFit="contain" /> : null}
            <View
              style={{
                alignSelf: 'flex-start',
                paddingHorizontal: 12,
                paddingVertical: 4,
                backgroundColor: invertEyebrow ? theme.accent : 'transparent',
              }}>
              <ThemedText
                style={{
                  fontSize: 13,
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: 1.2,
                  color: invertEyebrow ? '#fff' : theme.accent,
                }}>
                {eyebrow}
              </ThemedText>
            </View>
          </View>
          <ThemedText style={{ fontSize: 28, lineHeight: 34, fontWeight: '700' }}>{title}</ThemedText>
          <ThemedText style={{ fontSize: 14, lineHeight: 20, fontWeight: '500', color: theme.textSecondary }}>
            {subtitle}
          </ThemedText>
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
