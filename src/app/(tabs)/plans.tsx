import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';

import { fetchMoves, toggleChecklistItem } from '@/api/moves';
import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import type { MovePlan } from '@/types/api';

export default function PlansScreen() {
  const theme = useTheme();
  const { t, isKorean } = useI18n();
  const [moves, setMoves] = useState<MovePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMoves = useCallback(async () => {
    const data = await fetchMoves();
    setMoves(data);
  }, []);

  useEffect(() => {
    loadMoves()
      .catch((e: unknown) => {
        const message = e instanceof Error ? e.message : t('이동 계획을 불러오지 못했습니다.', 'Failed to load move plans.');
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [loadMoves, t]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      await loadMoves();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : t('새로고침에 실패했습니다.', 'Refresh failed.');
      setError(message);
    } finally {
      setRefreshing(false);
    }
  }, [loadMoves, t]);

  const onToggleItem = useCallback(async (moveId: number, itemId: number) => {
    setMoves((prev) =>
      prev.map((move) =>
        move.id === moveId
          ? {
              ...move,
              checklist: move.checklist.map((item) =>
                item.id === itemId ? { ...item, is_done: !item.is_done } : item,
              ),
            }
          : move,
      ),
    );

    try {
      const updated = await toggleChecklistItem(moveId, itemId);
      setMoves((prev) =>
        prev.map((move) =>
          move.id === moveId
            ? {
                ...move,
                checklist: move.checklist.map((item) => (item.id === itemId ? updated : item)),
              }
            : move,
        ),
      );
    } catch {
      setMoves((prev) =>
        prev.map((move) =>
          move.id === moveId
            ? {
                ...move,
                checklist: move.checklist.map((item) =>
                  item.id === itemId ? { ...item, is_done: !item.is_done } : item,
                ),
              }
            : move,
        ),
      );
    }
  }, []);

  const localizeStage = useCallback(
    (stage: MovePlan['stage']) => {
      if (!isKorean) {
        if (stage === 'planning') return 'Planning';
        if (stage === 'booked') return 'Booked';
        return 'Completed';
      }
      if (stage === 'planning') return '계획중';
      if (stage === 'booked') return '예약완료';
      return '완료';
    },
    [isKorean],
  );

  return (
    <ScreenShell
      eyebrow={t('이동 보드', 'Move Board')}
      title={t('체류, 비자, 집중 루틴을 끊기지 않게 관리하세요.', 'Coordinate stays, visas, and focus windows without losing momentum.')}
      subtitle={t('백엔드와 동기화된 체크리스트/단계 데이터.', 'Checklist and stage data synced from the backend.')}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}>
      {error ? (
        <View
          className="rounded-2xl border p-4"
          style={[
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}>
          <ThemedText className="text-sm leading-5 font-medium" style={{ color: theme.destructive }}>
            {error}
          </ThemedText>
        </View>
      ) : null}

      {!loading && moves.length === 0 ? (
        <View
          className="rounded-2xl border p-4"
          style={[
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}>
          <ThemedText className="text-sm leading-5 font-medium" style={{ color: theme.textSecondary }}>
            {t('아직 등록된 이동 계획이 없습니다.', 'No move plans yet.')}
          </ThemedText>
        </View>
      ) : null}

      {moves.map((move) => (
        <View
          key={move.id}
          className="rounded-3xl border p-6 gap-2"
          style={[
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}>
          <ThemedText className="text-xl leading-[26px] font-bold">{move.title}</ThemedText>
          <ThemedText className="text-sm font-medium" style={{ color: theme.textSecondary }}>
            {move.from_city ?? '-'} → {move.to_city ?? '-'}
          </ThemedText>
          <ThemedText
            className="text-[13px] font-bold uppercase tracking-[0.7px]"
            style={{ color: theme.accent }}>
            {localizeStage(move.stage)}
          </ThemedText>

          {move.checklist.map((item) => (
            <Pressable
              key={item.id}
              className="flex-row items-center gap-2 border rounded-xl p-2"
              style={{ borderColor: theme.border }}
              onPress={() => void onToggleItem(move.id, item.id)}>
              <View
                className="w-[14px] h-[14px] rounded-full border-[1.5px]"
                style={{
                  backgroundColor: item.is_done ? theme.accent : 'transparent',
                  borderColor: theme.accent,
                }}
              />
              <ThemedText
                className="flex-1 text-[15px] leading-[22px] font-medium"
                style={{
                  color: item.is_done ? theme.textSecondary : theme.text,
                  textDecorationLine: item.is_done ? 'line-through' : 'none',
                }}>
                {item.text}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      ))}
    </ScreenShell>
  );
}
