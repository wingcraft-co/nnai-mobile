import React, { useEffect, useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';

import { fetchCityStays } from '@/api/cities';
import { GamePanel, PixelButton } from '@/components/game-ui';
import { OpsRiskBadge } from '@/components/ops-risk-badge';
import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { computeMustLeaveDate, deriveRiskState, validateMoveConnection } from '@/features/nomad-ops';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { trackNomadOpsEvent } from '@/lib/analytics';
import type { CityStay } from '@/types/api';

const DEFAULT_ALLOWED_DAYS = 90;

function addDays(baseISO: string, days: number): string {
  const date = new Date(`${baseISO}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export default function ConnectScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [stays, setStays] = useState<CityStay[]>([]);
  const [departDate, setDepartDate] = useState(todayISO);
  const [arriveDate, setArriveDate] = useState(addDays(todayISO, 1));
  const [checkinDate, setCheckinDate] = useState(addDays(todayISO, 1));
  const [confirmState, setConfirmState] = useState<string | null>(null);

  useEffect(() => {
    fetchCityStays()
      .then(setStays)
      .catch(() => {
        // Keep local validation operational even if stay sync fails.
      });
  }, []);

  const currentStay = useMemo(() => stays.find((stay) => stay.left_at === null) ?? null, [stays]);
  const mustLeaveDate = useMemo(
    () => (currentStay ? computeMustLeaveDate(currentStay.arrived_at, DEFAULT_ALLOWED_DAYS) : addDays(todayISO, 30)),
    [currentStay, todayISO],
  );
  const risk = useMemo(() => deriveRiskState(todayISO, mustLeaveDate, 7), [mustLeaveDate, todayISO]);
  const check = useMemo(
    () =>
      validateMoveConnection({
        mustLeaveDate,
        departDate,
        arriveDate,
        checkinDate,
      }),
    [arriveDate, checkinDate, departDate, mustLeaveDate],
  );

  useEffect(() => {
    trackNomadOpsEvent('move_draft_created', { departDate, arriveDate, checkinDate });
  }, [arriveDate, checkinDate, departDate]);

  useEffect(() => {
    if (!check.ok) {
      trackNomadOpsEvent('constraint_error_shown', { reasons: check.reasons });
    }
  }, [check.ok, check.reasons]);

  const onConfirmDraft = () => {
    if (!check.ok) return;
    setConfirmState(t('이동안이 확정되었습니다.', 'Move draft confirmed.'));
    trackNomadOpsEvent('move_draft_confirmed', {
      mustLeaveDate,
      departDate,
      arriveDate,
      checkinDate,
    });
  };

  return (
    <ScreenShell
      eyebrow={t('연결', 'Connect')}
      title={t('이동 연결 검증', 'Move Connection Checks')}
      subtitle={t(
        '출국 필요일, 출발일, 도착일, 체크인일 충돌을 즉시 검사합니다.',
        'Validate must-leave, departure, arrival, and check-in constraints in real time.',
      )}>
      <GamePanel
        title={t('검증 입력', 'Validation Input')}
        subtitle={t('날짜는 YYYY-MM-DD 형식으로 입력하세요.', 'Enter dates as YYYY-MM-DD.')}>
        <View style={{ gap: 10 }}>
          <Field label={t('출국 필요일', 'Must Leave Date')} value={mustLeaveDate} editable={false} />
          <Field label={t('출발일', 'Depart Date')} value={departDate} onChange={setDepartDate} />
          <Field label={t('도착일', 'Arrive Date')} value={arriveDate} onChange={setArriveDate} />
          <Field label={t('체크인일', 'Check-in Date')} value={checkinDate} onChange={setCheckinDate} />
          <OpsRiskBadge risk={risk} />
          {!check.ok ? (
            <ThemedText style={{ color: theme.destructive, fontSize: 12 }}>
              {t('제약 위반', 'Constraint errors')}: {check.reasons.join(', ')}
            </ThemedText>
          ) : (
            <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }}>
              {t('모든 제약을 통과했습니다.', 'All constraints passed.')}
            </ThemedText>
          )}
          {confirmState ? <ThemedText style={{ color: theme.accent, fontSize: 12 }}>{confirmState}</ThemedText> : null}
        </View>
      </GamePanel>

      <PixelButton
        label={t('이동안 확정', 'Confirm Move')}
        onPress={onConfirmDraft}
        disabled={!check.ok}
      />
    </ScreenShell>
  );
}

function Field({
  label,
  value,
  onChange,
  editable = true,
}: {
  label: string;
  value: string;
  onChange?: (next: string) => void;
  editable?: boolean;
}) {
  const theme = useTheme();

  return (
    <View style={{ gap: 6 }}>
      <ThemedText style={{ fontSize: 11, fontWeight: '700', color: theme.textSecondary }}>{label}</ThemedText>
      <TextInput
        value={value}
        editable={editable}
        onChangeText={onChange}
        autoCapitalize="none"
        autoCorrect={false}
        style={{
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 12,
          paddingHorizontal: 10,
          paddingVertical: 8,
          color: editable ? theme.text : theme.textSecondary,
          backgroundColor: editable ? theme.background : theme.surfaceMuted,
          fontSize: 13,
          fontFamily: 'monospace',
        }}
      />
    </View>
  );
}
