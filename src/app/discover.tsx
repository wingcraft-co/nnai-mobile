import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { circles, cityRadar } from '@/data/mock';
import { useTheme } from '@/hooks/use-theme';

export default function DiscoverScreen() {
  const theme = useTheme();

  return (
    <ScreenShell
      eyebrow="City Radar"
      title="Discover where nomads are actually staying, working, and meeting."
      subtitle="Rank cities by network density, cost comfort, and practical quality-of-life signals.">
      <ThemedText style={styles.sectionTitle}>This month&apos;s signals</ThemedText>
      {cityRadar.map((city) => (
        <View
          key={city.id}
          style={[
            styles.cityCard,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}>
          <View style={styles.cityRow}>
            <View style={styles.cityText}>
              <ThemedText style={styles.cityName}>{city.name}</ThemedText>
              <ThemedText style={[styles.cityAngle, { color: theme.textSecondary }]}>
                {city.angle}
              </ThemedText>
            </View>
            <View style={[styles.scoreBadge, { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText style={styles.scoreText}>{city.wifiScore}</ThemedText>
            </View>
          </View>
          <ThemedText style={[styles.cityPulse, { color: theme.textSecondary }]}>
            {city.pulse}
          </ThemedText>
          <ThemedText style={[styles.costIndex, { color: theme.accent }]}>
            Cost index {city.costIndex}
          </ThemedText>
        </View>
      ))}

      <ThemedText style={styles.sectionTitle}>Curated circles</ThemedText>
      {circles.map((circle) => (
        <View
          key={circle.id}
          style={[
            styles.circleCard,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}>
          <ThemedText style={styles.circleName}>{circle.name}</ThemedText>
          <ThemedText style={[styles.circleMeta, { color: theme.accent }]}>
            {circle.members} members
          </ThemedText>
          <ThemedText style={[styles.circleNote, { color: theme.textSecondary }]}>
            {circle.note}
          </ThemedText>
        </View>
      ))}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
  },
  cityCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  cityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  cityText: {
    flex: 1,
    gap: Spacing.one,
  },
  cityName: {
    fontSize: 20,
    fontWeight: '700',
  },
  cityAngle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  scoreBadge: {
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    paddingHorizontal: Spacing.two,
  },
  scoreText: {
    fontSize: 22,
    fontWeight: '700',
  },
  cityPulse: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '500',
  },
  costIndex: {
    fontSize: 14,
    fontWeight: '700',
  },
  circleCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.one,
  },
  circleName: {
    fontSize: 18,
    fontWeight: '700',
  },
  circleMeta: {
    fontSize: 14,
    fontWeight: '700',
  },
  circleNote: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
});
