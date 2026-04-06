import { Image } from 'expo-image';
import React, { PropsWithChildren } from 'react';
import { ScrollView, type RefreshControlProps, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { EarthAssets } from '@/constants/persona-types';
import { useTheme } from '@/hooks/use-theme';

type ScreenShellProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  subtitle: string;
  invertEyebrow?: boolean;
  showLogo?: boolean;
  hideHero?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
}>;

export function ScreenShell({
  children,
  eyebrow,
  title,
  subtitle,
  invertEyebrow = false,
  showLogo = false,
  hideHero = false,
  refreshControl,
}: ScreenShellProps) {
  const theme = useTheme();
  const today = new Date();
  const dayLabel = today.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View
        style={{
          marginHorizontal: 16,
          marginTop: 10,
          marginBottom: 8,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 14,
          backgroundColor: theme.surfaceMuted,
          paddingHorizontal: 14,
          paddingVertical: 9,
          alignItems: 'flex-start',
        }}>
        <ThemedText style={{ fontSize: 10, fontWeight: '800', color: theme.textSecondary, letterSpacing: 1.1 }}>
          {dayLabel.toUpperCase()}
        </ThemedText>
      </View>
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4 gap-4 pb-10"
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}>
        {!hideHero ? (
          <View
            style={{
              backgroundColor: theme.surface,
              borderColor: theme.border,
              borderWidth: 1,
              borderRadius: 24,
              overflow: 'hidden',
              padding: 22,
              gap: 10,
            }}>
            <View
              style={{
                position: 'absolute',
                top: -20,
                right: -30,
                width: 140,
                height: 140,
                borderRadius: 70,
                backgroundColor: theme.surfaceSelected,
                opacity: 0.95,
              }}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {showLogo ? <Image source={EarthAssets.logo} style={{ width: 24, height: 24 }} contentFit="contain" /> : null}
              <View
                style={{
                  alignSelf: 'flex-start',
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  borderRadius: 999,
                  backgroundColor: invertEyebrow ? theme.accent : theme.surfaceMuted,
                }}>
                <ThemedText
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: 1.2,
                    color: invertEyebrow ? '#fff' : theme.accent,
                  }}>
                  {eyebrow}
                </ThemedText>
              </View>
            </View>
            <ThemedText style={{ fontSize: 32, lineHeight: 38, fontWeight: '800' }}>{title}</ThemedText>
            <ThemedText style={{ fontSize: 14, lineHeight: 20, fontWeight: '500', color: theme.textSecondary }}>
              {subtitle}
            </ThemedText>
          </View>
        ) : null}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
