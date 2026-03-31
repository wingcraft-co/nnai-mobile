import React, { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ScreenShellProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  subtitle: string;
}>;

export function ScreenShell({ children, eyebrow, title, subtitle }: ScreenShellProps) {
  const theme = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}>
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.border,
              shadowColor: theme.text,
            },
          ]}>
          <ThemedText style={[styles.eyebrow, { color: theme.accent }]}>{eyebrow}</ThemedText>
          <ThemedText style={styles.title}>{title}</ThemedText>
          <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</ThemedText>
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  heroCard: {
    borderRadius: 28,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.two,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
});
