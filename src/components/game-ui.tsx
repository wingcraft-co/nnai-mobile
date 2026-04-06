import React, { PropsWithChildren } from 'react';
import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export function GamePanel({
  title,
  subtitle,
  children,
}: PropsWithChildren<{ title: string; subtitle?: string }>) {
  const theme = useTheme();
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 18,
        backgroundColor: theme.surface,
        padding: 16,
        gap: 10,
      }}>
      <View>
        <ThemedText style={{ fontSize: 11, fontWeight: '800', letterSpacing: 1, color: theme.accent }}>
          {title.toUpperCase()}
        </ThemedText>
        {subtitle ? (
          <ThemedText style={{ fontSize: 11, color: theme.textSecondary, marginTop: 3, lineHeight: 15 }}>{subtitle}</ThemedText>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export function StatTile({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'accent' | 'danger';
}) {
  const theme = useTheme();
  const toneColor = tone === 'danger' ? theme.destructive : tone === 'accent' ? theme.accent : theme.text;

  return (
    <View
      style={{
        flex: 1,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 14,
        backgroundColor: theme.surfaceMuted,
        paddingVertical: 10,
        paddingHorizontal: 8,
        alignItems: 'center',
        gap: 2,
      }}>
      <ThemedText style={{ fontSize: 10, color: theme.textSecondary, fontWeight: '700' }}>{label}</ThemedText>
      <ThemedText style={{ fontSize: 15, color: toneColor, fontWeight: '800' }}>{value}</ThemedText>
    </View>
  );
}

export function ProgressMeter({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const theme = useTheme();
  const ratio = max <= 0 ? 0 : Math.max(0, Math.min(1, value / max));
  return (
    <View style={{ gap: 5 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <ThemedText style={{ fontSize: 10, color: theme.textSecondary, fontWeight: '700' }}>{label}</ThemedText>
        <ThemedText style={{ fontSize: 10, color: theme.accent, fontWeight: '800' }}>
          {value}/{max}
        </ThemedText>
      </View>
      <View
        style={{
          height: 10,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 999,
          backgroundColor: theme.surfaceMuted,
          overflow: 'hidden',
        }}>
        <View
          style={{
            width: `${Math.round(ratio * 100)}%`,
            height: '100%',
            backgroundColor: theme.accent,
            borderRadius: 999,
          }}
        />
      </View>
    </View>
  );
}

export function PixelButton({
  label,
  onPress,
  tone = 'accent',
}: {
  label: string;
  onPress: () => void;
  tone?: 'accent' | 'neutral';
}) {
  const theme = useTheme();
  const isAccent = tone === 'accent';
  return (
    <Pressable
      onPress={onPress}
      style={{
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: isAccent ? theme.accent : theme.border,
        borderRadius: 12,
        backgroundColor: isAccent ? theme.surfaceSelected : theme.surfaceMuted,
        paddingHorizontal: 14,
        paddingVertical: 9,
      }}>
      <ThemedText style={{ fontSize: 12, fontWeight: '800', color: isAccent ? theme.accent : theme.textSecondary }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}
