import React, { PropsWithChildren } from 'react';
import { ScrollView, type RefreshControlProps, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

type ScreenShellProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  subtitle: string;
  invertEyebrow?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
}>;

export function ScreenShell({
  children,
  eyebrow,
  title,
  subtitle,
  invertEyebrow = false,
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
          className="rounded-[28px] border p-6 gap-2"
          style={[
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.border,
              shadowColor: theme.text,
              shadowOpacity: 0.08,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 10 },
              elevation: 2,
            },
          ]}>
          <View
            className="self-start rounded-full px-3 py-1"
            style={{ backgroundColor: invertEyebrow ? theme.accent : 'transparent' }}>
            <ThemedText
              className="text-[13px] font-bold uppercase tracking-[1.2px]"
              style={{ color: invertEyebrow ? '#fff' : theme.accent }}>
              {eyebrow}
            </ThemedText>
          </View>
          <ThemedText className="text-[34px] leading-[38px] font-bold">{title}</ThemedText>
          <ThemedText className="text-base leading-6 font-medium" style={{ color: theme.textSecondary }}>
            {subtitle}
          </ThemedText>
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
