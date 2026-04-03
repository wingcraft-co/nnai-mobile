import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';

import { fetchProfile } from '@/api/profile';
import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useAuth } from '@/store/auth-store';
import type { Profile } from '@/types/api';

export default function ProfileScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const { logout } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    const data = await fetchProfile();
    setProfile(data);
  }, []);

  useEffect(() => {
    loadProfile()
      .catch((e: unknown) => {
        const message = e instanceof Error ? e.message : t('프로필을 불러오지 못했습니다.', 'Failed to load profile.');
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [loadProfile, t]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      await loadProfile();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : t('새로고침에 실패했습니다.', 'Refresh failed.');
      setError(message);
    } finally {
      setRefreshing(false);
    }
  }, [loadProfile, t]);

  const initials = useMemo(() => {
    if (!profile) {
      return 'NA';
    }
    return profile.name
      .split(' ')
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('')
      .slice(0, 2);
  }, [profile]);

  return (
    <ScreenShell
      eyebrow={t('프로필', 'Identity')}
      title={t('팔로워 수보다 신뢰할 수 있는 노마드 네트워크를 만드세요.', 'Build a trusted nomad graph, not just another follower count.')}
      subtitle={t('실시간 API 기반 유저 프로필, 배지, 계정 관리.', 'User profile, badges, and account controls from live API.')}
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

      {!loading && !profile ? (
        <View
          className="rounded-2xl border p-4"
          style={[
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}>
          <ThemedText className="text-sm leading-5 font-medium" style={{ color: theme.textSecondary }}>
            {t('프로필 데이터가 없습니다.', 'No profile data available.')}
          </ThemedText>
        </View>
      ) : null}

      {profile ? (
        <View
          className="rounded-[28px] border p-6 items-center gap-2"
          style={[
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}>
          <View className="w-[84px] h-[84px] rounded-full items-center justify-center" style={{ backgroundColor: theme.backgroundSelected }}>
            <ThemedText className="text-[28px] font-bold">{initials}</ThemedText>
          </View>
          <ThemedText className="text-2xl font-bold">{profile.name}</ThemedText>
          <ThemedText className="text-sm font-bold" style={{ color: theme.accent }}>
            {profile.email}
          </ThemedText>

          <View className="flex-row flex-wrap justify-center gap-2">
            {profile.badges.map((badge) => (
              <View
                key={badge}
                className="rounded-full border px-2 py-1"
                style={[
                  { backgroundColor: theme.backgroundSelected, borderColor: theme.border },
                ]}>
                <ThemedText className="text-[13px] font-bold">{badge}</ThemedText>
              </View>
            ))}
          </View>

          <View className="w-full flex-row gap-2">
            <StatCard label={t('핀', 'Pins')} value={profile.stats.pins} />
            <StatCard label={t('포스트', 'Posts')} value={profile.stats.posts} />
            <StatCard label={t('서클', 'Circles')} value={profile.stats.circles} />
          </View>

          <Pressable
            onPress={() => void logout()}
            className="mt-1 rounded-full border px-4 py-1"
            style={{ borderColor: theme.border, backgroundColor: theme.backgroundSelected }}>
            <ThemedText className="text-sm font-bold" style={{ color: theme.accent }}>
              {t('로그아웃', 'Log out')}
            </ThemedText>
          </Pressable>
        </View>
      ) : null}
    </ScreenShell>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  const theme = useTheme();

  return (
    <View className="flex-1 rounded-[18px] border p-2 items-center" style={{ backgroundColor: theme.background, borderColor: theme.border }}>
      <ThemedText className="text-xl font-bold">{value}</ThemedText>
      <ThemedText className="text-xs font-semibold uppercase" style={{ color: theme.textSecondary }}>
        {label}
      </ThemedText>
    </View>
  );
}
