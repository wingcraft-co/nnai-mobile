import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { fetchCityStays } from '@/api/cities';
import { GamePanel, PixelButton, StatTile } from '@/components/game-ui';
import { OpsRiskBadge } from '@/components/ops-risk-badge';
import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { computeMustLeaveDate, deriveRiskState, type RiskState } from '@/features/nomad-ops';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { trackNomadOpsEvent } from '@/lib/analytics';
import type { CityStay } from '@/types/api';

const WARNING_WINDOW_DAYS = 7;
const DEFAULT_ALLOWED_DAYS = 90;
const RISK_KEYS = ['safe', 'warning', 'critical', 'overdue'];

export default function TimelineScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useI18n();
  const [stays, setStays] = useState<CityStay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentStay = useMemo(() => stays.find((stay) => stay.left_at === null) ?? null, [stays]);
  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const mustLeaveDate = useMemo(
    () => (currentStay ? computeMustLeaveDate(currentStay.arrived_at, DEFAULT_ALLOWED_DAYS) : null),
    [currentStay],
  );
  const risk: RiskState = useMemo(
    () => (mustLeaveDate ? deriveRiskState(todayISO, mustLeaveDate, WARNING_WINDOW_DAYS) : 'safe'),
    [mustLeaveDate, todayISO],
  );

  useEffect(() => {
    trackNomadOpsEvent('timeline_viewed');
  }, []);

  useEffect(() => {
    fetchCityStays()
      .then(setStays)
      .catch((e: unknown) => {
        const message =
          e instanceof Error ? e.message : t('타임라인을 불러오지 못했습니다.', 'Failed to load timeline.');
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    if (!mustLeaveDate) return;
    trackNomadOpsEvent('must_leave_computed', { mustLeaveDate, risk });
  }, [mustLeaveDate, risk]);

  return (
    <ScreenShell
      eyebrow={t('타임라인', 'Timeline')}
      title={t('노마드 운영 타임라인', 'Nomad Ops Timeline')}
      subtitle={t(
        '현재 체류 기준으로 출국 필요일과 리스크를 즉시 확인합니다.',
        'Review your must-leave date and risk from the active stay.',
      )}>
      <GamePanel
        title={t('체류 리스크', 'Stay Risk')}
        subtitle={t('Must Leave Date 기준으로 리스크를 판정합니다.', 'Risk is derived from Must Leave Date.')}>
        {loading ? <ActivityIndicator color={theme.accent} /> : null}
        {error ? <ThemedText style={{ color: theme.destructive, fontSize: 12 }}>{error}</ThemedText> : null}
        {!loading && !error ? (
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <StatTile label={t('오늘', 'Today')} value={todayISO} />
              <StatTile label={t('출국 필요일', 'Must Leave Date')} value={mustLeaveDate ?? '-'} tone="accent" />
            </View>
            <OpsRiskBadge risk={risk} />
            <ThemedText style={{ fontSize: 11, color: theme.textSecondary }}>
              {t('리스크 키', 'Risk keys')}: {RISK_KEYS.join(' / ')}
            </ThemedText>
            <ThemedText style={{ fontSize: 12, color: theme.textSecondary }}>
              {currentStay
                ? t(
                    `${currentStay.city} 체류 기준 ${DEFAULT_ALLOWED_DAYS}일 룰을 적용했습니다.`,
                    `${DEFAULT_ALLOWED_DAYS}-day allowance applied for your stay in ${currentStay.city}.`,
                  )
                : t('활성 체류가 없어 기본 SAFE 상태입니다.', 'No active stay found, defaulting to SAFE.')}
            </ThemedText>
          </View>
        ) : null}
      </GamePanel>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <PixelButton label={t('연결 검증 열기', 'Open Connect Checks')} onPress={() => router.push('/(tabs)/connect')} />
        <PixelButton label={t('알림 큐 보기', 'View Alert Queue')} onPress={() => router.push('/(tabs)/alerts')} tone="neutral" />
      </View>
    </ScreenShell>
  );
}
