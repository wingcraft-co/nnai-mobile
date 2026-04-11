import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { fetchCityStays } from '@/api/cities';
import { GamePanel } from '@/components/game-ui';
import { OpsRiskBadge } from '@/components/ops-risk-badge';
import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { buildAlertQueue, computeMustLeaveDate, deriveRiskState } from '@/features/nomad-ops';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { trackNomadOpsEvent } from '@/lib/analytics';
import type { CityStay } from '@/types/api';

const DEFAULT_ALLOWED_DAYS = 90;

type AlertItem = {
  key: string;
  severity: 'warning' | 'critical' | 'overdue' | 'safe';
  title: string;
  description: string;
};

export default function AlertsScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const [stays, setStays] = useState<CityStay[]>([]);

  useEffect(() => {
    fetchCityStays()
      .then(setStays)
      .catch(() => {
        // Alerts still render from local defaults.
      });
  }, []);

  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const currentStay = useMemo(() => stays.find((stay) => stay.left_at === null) ?? null, [stays]);
  const mustLeaveDate = useMemo(
    () => (currentStay ? computeMustLeaveDate(currentStay.arrived_at, DEFAULT_ALLOWED_DAYS) : null),
    [currentStay],
  );
  const risk = useMemo(
    () => (mustLeaveDate ? deriveRiskState(todayISO, mustLeaveDate, 7) : 'safe'),
    [mustLeaveDate, todayISO],
  );

  const alerts = useMemo(() => {
    const next: AlertItem[] = [];
    if (risk === 'overdue') {
      next.push({
        key: 'overstay',
        severity: 'critical',
        title: t('즉시 이동 필요', 'Immediate Move Required'),
        description: t('체류 기간이 초과되었습니다. 오늘 이동 계획을 확정하세요.', 'Stay limit exceeded. Confirm your move today.'),
      });
    } else if (risk === 'critical') {
      next.push({
        key: 'must_leave_today',
        severity: 'critical',
        title: t('오늘 출국 필요', 'Must Leave Today'),
        description: t('오늘이 출국 필요일입니다. 연결 검증 후 이동을 확정하세요.', 'Must-leave day is today. Validate and confirm your move.'),
      });
    } else if (risk === 'warning') {
      next.push({
        key: 'warning_buffer',
        severity: 'warning',
        title: t('버퍼 경고', 'Buffer Warning'),
        description: t('여유 기간이 7일 이하입니다. 이동안을 점검하세요.', 'Less than 7 days of buffer remaining.'),
      });
    } else {
      next.push({
        key: 'safe_window',
        severity: 'safe',
        title: t('안정 구간', 'Safe Window'),
        description: t('현재는 안정 구간입니다. 다음 이동 후보만 미리 준비하세요.', 'You are in a safe window. Prepare next-city options.'),
      });
    }
    return buildAlertQueue(next);
  }, [risk, t]);

  return (
    <ScreenShell
      eyebrow={t('알림', 'Alerts')}
      title={t('리스크 알림 큐', 'Risk Alert Queue')}
      subtitle={t('위험도 기준으로 우선순위를 자동 정렬합니다.', 'Alerts are auto-prioritized by severity.')}>
      <GamePanel
        title={t('현재 리스크', 'Current Risk')}
        subtitle={t('critical / overdue 알림을 우선 확인하세요.', 'Prioritize critical and overdue alerts.')}>
        <OpsRiskBadge risk={risk} />
      </GamePanel>

      {alerts.map((alert) => (
        <Pressable
          key={alert.key}
          onPress={() => {
            if (alert.severity === 'critical') {
              trackNomadOpsEvent('critical_alert_opened', { key: alert.key });
            }
          }}
          style={{
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 14,
            padding: 14,
            gap: 6,
            backgroundColor: theme.surface,
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <ThemedText style={{ fontSize: 13, fontWeight: '800' }}>{alert.title}</ThemedText>
            <ThemedText style={{ fontSize: 11, fontWeight: '700', color: theme.textSecondary }}>
              {alert.severity.toUpperCase()}
            </ThemedText>
          </View>
          <ThemedText style={{ fontSize: 12, color: theme.textSecondary }}>{alert.description}</ThemedText>
        </Pressable>
      ))}
    </ScreenShell>
  );
}
