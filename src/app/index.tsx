import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { featuredPosts, nomadSnapshot } from '@/data/mock';
import { useTheme } from '@/hooks/use-theme';

export default function FeedScreen() {
  const theme = useTheme();

  return (
    <ScreenShell
      eyebrow="NNAI Nomad"
      title="A social layer for people who live and work in motion."
      subtitle="Trusted stays, city pulses, and move-week logistics in one cross-platform app.">
      <View style={styles.row}>
        <MetricCard label="Now in" value={nomadSnapshot.city} themeColor={theme.backgroundSelected} />
        <MetricCard label="Members online" value={String(nomadSnapshot.membersOnline)} />
      </View>
      <View
        style={[
          styles.weatherCard,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        ]}>
        <ThemedText style={styles.sectionLabel}>Live pulse</ThemedText>
        <ThemedText style={styles.weatherTitle}>{nomadSnapshot.weather}</ThemedText>
        <ThemedText style={[styles.weatherBody, { color: theme.textSecondary }]}>
          {nomadSnapshot.activeTrips} active move plans are being coordinated this week across the
          network.
        </ThemedText>
      </View>

      <ThemedText style={styles.sectionTitle}>Community feed</ThemedText>
      {featuredPosts.map((post) => (
        <View
          key={post.id}
          style={[
            styles.postCard,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}>
          <ThemedText style={styles.author}>{post.author}</ThemedText>
          <ThemedText style={[styles.role, { color: theme.textSecondary }]}>{post.role}</ThemedText>
          <ThemedText style={styles.postTitle}>{post.title}</ThemedText>
          <ThemedText style={[styles.postBody, { color: theme.textSecondary }]}>{post.body}</ThemedText>
          <View style={styles.tagRow}>
            {post.tags.map((tag) => (
              <View
                key={tag}
                style={[
                  styles.tag,
                  { backgroundColor: theme.backgroundSelected, borderColor: theme.border },
                ]}>
                <ThemedText style={styles.tagText}>#{tag}</ThemedText>
              </View>
            ))}
          </View>
          <ThemedText style={[styles.metrics, { color: theme.textSecondary }]}>
            {post.likes} likes · {post.comments} comments
          </ThemedText>
        </View>
      ))}
    </ScreenShell>
  );
}

function MetricCard({
  label,
  value,
  themeColor,
}: {
  label: string;
  value: string;
  themeColor?: string;
}) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.metricCard,
        {
          backgroundColor: themeColor ?? theme.backgroundElement,
          borderColor: theme.border,
        },
      ]}>
      <ThemedText style={[styles.metricLabel, { color: theme.textSecondary }]}>{label}</ThemedText>
      <ThemedText style={styles.metricValue}>{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  metricCard: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  metricValue: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '700',
  },
  weatherCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.one,
  },
  sectionLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    fontWeight: '700',
  },
  weatherTitle: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '700',
  },
  weatherBody: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    marginTop: Spacing.one,
  },
  postCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  author: {
    fontSize: 18,
    fontWeight: '700',
  },
  role: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  postTitle: {
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '700',
  },
  postBody: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '500',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  tag: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '700',
  },
  metrics: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
});
