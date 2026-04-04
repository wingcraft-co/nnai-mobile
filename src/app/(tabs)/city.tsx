import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, TextInput, View } from 'react-native';

import { createPin, fetchPins } from '@/api/cities';
import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import type { Pin } from '@/types/api';

export default function CityScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const [pins, setPins] = useState<Pin[]>([]);
  const [countryInput, setCountryInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPins = useCallback(async () => {
    const data = await fetchPins();
    setPins(data);
  }, []);

  useEffect(() => {
    loadPins()
      .catch((e: unknown) => {
        const message = e instanceof Error ? e.message : t('국가 목록을 불러오지 못했습니다.', 'Failed to load countries.');
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [loadPins, t]);

  const countries = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];

    for (const pin of pins) {
      const name = (pin.display || pin.city || '').trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(name);
    }

    return out;
  }, [pins]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      await loadPins();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : t('새로고침에 실패했습니다.', 'Refresh failed.');
      setError(message);
    } finally {
      setRefreshing(false);
    }
  }, [loadPins, t]);

  const onSaveCountry = useCallback(async () => {
    const country = countryInput.trim();
    if (!country || saving) return;

    const exists = countries.some((c) => c.toLowerCase() === country.toLowerCase());
    if (exists) {
      setCountryInput('');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createPin({
        city: country,
        display: country,
        note: 'visited-country',
        lat: 0,
        lng: 0,
      });
      setCountryInput('');
      await loadPins();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : t('국가 저장에 실패했습니다.', 'Failed to save country.');
      setError(message);
    } finally {
      setSaving(false);
    }
  }, [countries, countryInput, loadPins, saving, t]);

  return (
    <ScreenShell
      eyebrow={t('국가', 'Countries')}
      title={t('내가 가본 국가', 'Countries I Have Visited')}
      subtitle={t('방문한 국가를 저장해 누적해보세요.', 'Save and track countries you have visited.')}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}>
      <View
        style={{
          backgroundColor: theme.backgroundElement,
          borderWidth: 1,
          borderColor: theme.border,
          padding: 16,
          gap: 10,
        }}>
        <ThemedText style={{ fontSize: 13, fontWeight: '700', color: theme.textSecondary }}>
          {t('국가 추가', 'Add Country')}
        </ThemedText>
        <TextInput
          value={countryInput}
          onChangeText={setCountryInput}
          placeholder={t('예: Japan, Portugal, Thailand', 'e.g. Japan, Portugal, Thailand')}
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="words"
          style={{
            backgroundColor: theme.background,
            borderWidth: 1,
            borderColor: theme.border,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 14,
            color: theme.text,
            fontFamily: 'monospace',
          }}
        />
        <Pressable
          onPress={() => void onSaveCountry()}
          disabled={saving || !countryInput.trim()}
          style={{
            alignSelf: 'flex-start',
            borderWidth: 1,
            borderColor: theme.accent,
            backgroundColor: theme.backgroundSelected,
            paddingHorizontal: 12,
            paddingVertical: 8,
            opacity: saving || !countryInput.trim() ? 0.6 : 1,
          }}>
          <ThemedText style={{ fontSize: 12, fontWeight: '700', color: theme.accent }}>
            {saving ? t('저장 중...', 'Saving...') : t('국가 저장', 'Save Country')}
          </ThemedText>
        </Pressable>
      </View>

      {error ? (
        <View style={{ backgroundColor: theme.backgroundElement, borderWidth: 1, borderColor: theme.border, padding: 16 }}>
          <ThemedText style={{ fontSize: 13, color: theme.destructive }}>{error}</ThemedText>
        </View>
      ) : null}

      <View
        style={{
          backgroundColor: theme.backgroundElement,
          borderWidth: 1,
          borderColor: theme.border,
          padding: 16,
          gap: 10,
        }}>
        <ThemedText style={{ fontSize: 13, fontWeight: '700', color: theme.textSecondary }}>
          {t('저장된 국가', 'Saved Countries')} · {countries.length}
        </ThemedText>

        {!loading && countries.length === 0 ? (
          <ThemedText style={{ fontSize: 12, color: theme.textSecondary }}>
            {t('아직 저장된 국가가 없습니다.', 'No saved countries yet.')}
          </ThemedText>
        ) : null}

        {countries.map((country) => (
          <View
            key={country}
            style={{
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.backgroundSelected,
              paddingHorizontal: 10,
              paddingVertical: 8,
            }}>
            <ThemedText style={{ fontSize: 13, fontWeight: '700' }}>{country}</ThemedText>
          </View>
        ))}
      </View>
    </ScreenShell>
  );
}
