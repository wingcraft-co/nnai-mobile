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
  const day = new Date().getDate();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View
        style={{
          marginHorizontal: 16,
          marginTop: 10,
          marginBottom: 8,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 12,
          backgroundColor: theme.backgroundElement,
          paddingHorizontal: 12,
          paddingVertical: 8,
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}>
        <ThemedText style={{ fontSize: 11, fontWeight: '800', color: theme.accent }}>DAY {day}</ThemedText>
        <ThemedText style={{ fontSize: 11, fontWeight: '700', color: theme.textSecondary }}>SIM MODE</ThemedText>
      </View>
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4 gap-4 pb-10"
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}>
        <View
          style={{
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border,
            borderWidth: 1,
            borderRadius: 20,
            overflow: 'hidden',
            padding: 22,
            gap: 8,
          }}>
          <View
            style={{
              position: 'absolute',
              top: -20,
              right: -30,
              width: 140,
              height: 140,
              borderRadius: 70,
              backgroundColor: theme.backgroundSelected,
              opacity: 0.9,
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
                backgroundColor: invertEyebrow ? theme.accent : 'transparent',
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
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
