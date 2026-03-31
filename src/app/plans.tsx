import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { moveBoard, stayPlaybook } from '@/data/mock';
import { useTheme } from '@/hooks/use-theme';

export default function PlansScreen() {
  const theme = useTheme();

  return (
    <ScreenShell
      eyebrow="Move Board"
      title="Coordinate stays, visas, and focus windows without losing momentum."
      subtitle="A mobile-first control room for the operational side of digital nomad life.">
      {moveBoard.map((move) => (
        <View
          key={move.id}
          style={[
            styles.planCard,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}>
          <ThemedText style={styles.planTitle}>{move.title}</ThemedText>
          <ThemedText style={[styles.planStage, { color: theme.accent }]}>{move.stage}</ThemedText>
          {move.checklist.map((item) => (
            <View key={item} style={styles.checkRow}>
              <View style={[styles.bullet, { backgroundColor: theme.accent }]} />
              <ThemedText style={[styles.checkText, { color: theme.textSecondary }]}>{item}</ThemedText>
            </View>
          ))}
        </View>
      ))}

      <View
        style={[
          styles.playbookCard,
          { backgroundColor: theme.backgroundSelected, borderColor: theme.border },
        ]}>
        <ThemedText style={styles.playbookTitle}>Stay playbook</ThemedText>
        {stayPlaybook.map((item) => (
          <ThemedText key={item} style={styles.playbookItem}>
            • {item}
          </ThemedText>
        ))}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  planCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  planTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
  },
  planStage: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  checkText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  playbookCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  playbookTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  playbookItem: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '500',
  },
});
