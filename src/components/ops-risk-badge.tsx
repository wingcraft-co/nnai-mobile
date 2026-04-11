import React from 'react';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { RiskState } from '@/features/nomad-ops';
import { useTheme } from '@/hooks/use-theme';

const LABELS: Record<RiskState, string> = {
  safe: 'SAFE',
  warning: 'WARNING',
  critical: 'CRITICAL',
  overdue: 'OVERDUE',
};

export function OpsRiskBadge({ risk }: { risk: RiskState }) {
  const theme = useTheme();
  const tone =
    risk === 'overdue' || risk === 'critical'
      ? theme.destructive
      : risk === 'warning'
        ? theme.accent
        : theme.textSecondary;

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: tone,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
        alignSelf: 'flex-start',
        backgroundColor: theme.surfaceMuted,
      }}>
      <ThemedText style={{ fontSize: 11, fontWeight: '800', color: tone }}>{LABELS[risk]}</ThemedText>
    </View>
  );
}
