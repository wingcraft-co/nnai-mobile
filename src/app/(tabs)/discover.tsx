import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';

import { fetchCities } from '@/api/cities';
import { fetchCircles, toggleCircleMembership } from '@/api/circles';
import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import type { Circle, City } from '@/types/api';

export default function DiscoverScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const [cities, setCities] = useState<City[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [cityData, circleData] = await Promise.all([fetchCities(), fetchCircles()]);
    setCities(cityData);
    setCircles(circleData);
  }, []);

  useEffect(() => {
    loadData()
      .catch((e: unknown) => {
        const message = e instanceof Error ? e.message : t('탐색 데이터를 불러오지 못했습니다.', 'Failed to load discover data.');
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [loadData, t]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      await loadData();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : t('새로고침에 실패했습니다.', 'Refresh failed.');
      setError(message);
    } finally {
      setRefreshing(false);
    }
  }, [loadData, t]);

  const onToggleCircle = useCallback(async (circleId: number) => {
    setCircles((prev) =>
      prev.map((circle) =>
        circle.id === circleId
          ? {
              ...circle,
              joined: !circle.joined,
              member_count: circle.joined
                ? Math.max(0, circle.member_count - 1)
                : circle.member_count + 1,
            }
          : circle,
      ),
    );

    try {
      const result = await toggleCircleMembership(circleId);
      setCircles((prev) =>
        prev.map((circle) => {
          if (circle.id !== circleId) {
            return circle;
          }

          const nextCount =
            circle.member_count + (result.joined === circle.joined ? 0 : result.joined ? 1 : -1);
          return {
            ...circle,
            joined: result.joined,
            member_count: Math.max(0, nextCount),
          };
        }),
      );
    } catch {
      setCircles((prev) =>
        prev.map((circle) =>
          circle.id === circleId
            ? {
                ...circle,
                joined: !circle.joined,
                member_count: circle.joined
                  ? Math.max(0, circle.member_count - 1)
                  : circle.member_count + 1,
              }
            : circle,
        ),
      );
    }
  }, []);

  return (
    <ScreenShell
      eyebrow={t('도시 레이더', 'City Radar')}
      title={t('노마드가 실제로 머물고, 일하고, 만나는 도시를 찾아보세요.', 'Discover where nomads are actually staying, working, and meeting.')}
      subtitle={t('백엔드 실데이터 기반 도시/서클 정보.', 'Live city and circle data from the backend.')}
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

      <ThemedText className="text-[22px] leading-7 font-bold">{t('검증된 도시', 'Verified cities')}</ThemedText>
      {!loading && cities.length === 0 ? (
        <View
          className="rounded-2xl border p-4"
          style={[
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}>
          <ThemedText className="text-sm leading-5 font-medium" style={{ color: theme.textSecondary }}>
            {t('표시할 도시 데이터가 없습니다.', 'No city data to display.')}
          </ThemedText>
        </View>
      ) : null}
      {cities.map((city) => (
        <View
          key={city.city_id}
          className="rounded-3xl border p-6 gap-1"
          style={[
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}>
          <ThemedText className="text-xl font-bold">
            {city.city_kr ?? city.city}, {city.country ?? city.country_id}
          </ThemedText>
          <ThemedText className="text-sm leading-5 font-medium" style={{ color: theme.textSecondary }}>
            {t('비용', 'Cost')} ${city.monthly_cost_usd ?? 'N/A'} · {t('인터넷', 'Internet')} {city.internet_mbps ?? 'N/A'} Mbps
          </ThemedText>
          <ThemedText className="text-[13px] font-bold" style={{ color: theme.accent }}>
            {t('안전', 'Safety')} {city.safety_score ?? '-'} · {t('영어', 'English')} {city.english_score ?? '-'} · {t('노마드', 'Nomad')}{' '}
            {city.nomad_score ?? '-'}
          </ThemedText>
        </View>
      ))}

      <ThemedText className="text-[22px] leading-7 font-bold">{t('추천 서클', 'Curated circles')}</ThemedText>
      {!loading && circles.length === 0 ? (
        <View
          className="rounded-2xl border p-4"
          style={[
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}>
          <ThemedText className="text-sm leading-5 font-medium" style={{ color: theme.textSecondary }}>
            {t('표시할 서클이 없습니다.', 'No circles to display.')}
          </ThemedText>
        </View>
      ) : null}
      {circles.map((circle) => (
        <View
          key={circle.id}
          className="rounded-3xl border p-6 gap-1"
          style={[
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}>
          <ThemedText className="text-lg font-bold">{circle.name}</ThemedText>
          <ThemedText className="text-sm font-semibold" style={{ color: theme.textSecondary }}>
            {circle.member_count} {t('명', 'members')}
          </ThemedText>
          {circle.description ? (
            <ThemedText className="text-[15px] leading-[22px] font-medium" style={{ color: theme.textSecondary }}>
              {circle.description}
            </ThemedText>
          ) : null}
          <Pressable
            onPress={() => void onToggleCircle(circle.id)}
            className="mt-1 self-start rounded-full border px-4 py-1"
            style={[
              { backgroundColor: theme.backgroundSelected, borderColor: theme.border },
            ]}>
            <ThemedText className="text-sm font-bold" style={{ color: theme.accent }}>
              {circle.joined ? t('나가기', 'Leave') : t('가입', 'Join')}
            </ThemedText>
          </Pressable>
        </View>
      ))}
    </ScreenShell>
  );
}
