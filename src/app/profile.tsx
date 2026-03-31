import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { profileSummary } from '@/data/mock';
import { useTheme } from '@/hooks/use-theme';

export default function ProfileScreen() {
  const theme = useTheme();

  return (
    <ScreenShell
      eyebrow="Identity"
      title="Build a trusted nomad graph, not just another follower count."
      subtitle="Profiles focus on reliable reviews, hosted gatherings, and useful local knowledge.">
      <View
        style={[
          styles.profileCard,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        ]}>
        <View style={[styles.avatar, { backgroundColor: theme.backgroundSelected }]}>
          <ThemedText style={styles.avatarText}>JP</ThemedText>
        </View>
        <ThemedText style={styles.name}>{profileSummary.name}</ThemedText>
        <ThemedText style={[styles.handle, { color: theme.accent }]}>{profileSummary.handle}</ThemedText>
        <ThemedText style={[styles.headline, { color: theme.textSecondary }]}>
          {profileSummary.headline}
        </ThemedText>
        <View style={styles.badgeRow}>
          {profileSummary.badges.map((badge) => (
            <View
              key={badge}
              style={[
                styles.badge,
                { backgroundColor: theme.backgroundSelected, borderColor: theme.border },
              ]}>
              <ThemedText style={styles.badgeText}>{badge}</ThemedText>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.statsRow}>
        {profileSummary.stats.map((stat) => (
          <View
            key={stat.label}
            style={[
              styles.statCard,
              { backgroundColor: theme.backgroundElement, borderColor: theme.border },
            ]}>
            <ThemedText style={styles.statValue}>{stat.value}</ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
              {stat.label}
            </ThemedText>
          </View>
        ))}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    borderRadius: 28,
    borderWidth: 1,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
  },
  handle: {
    fontSize: 14,
    fontWeight: '700',
  },
  headline: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '500',
    textAlign: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  statCard: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    padding: Spacing.three,
    alignItems: 'center',
    gap: Spacing.one,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    fontWeight: '600',
  },
});
