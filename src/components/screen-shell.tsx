import { Image } from 'expo-image';
import React, { PropsWithChildren, useEffect, useMemo, useState } from 'react';
import { ScrollView, type RefreshControlProps, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchCityStays } from '@/api/cities';
import { fetchProfile } from '@/api/profile';
import { ThemedText } from '@/components/themed-text';
import { EarthAssets } from '@/constants/persona-types';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useAuth } from '@/store/auth-store';
import type { Profile, User } from '@/types/api';

type ScreenShellProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  subtitle: string;
  invertEyebrow?: boolean;
  showLogo?: boolean;
  hideHero?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
}>;

const DEFAULT_HOME_CURRENCY = 'KRW';
const DEFAULT_LOCAL_CURRENCY = 'USD';
const COUNTRY_TO_CURRENCY: Record<string, string> = {
  korea: 'KRW',
  'south korea': 'KRW',
  대한민국: 'KRW',
  일본: 'JPY',
  japan: 'JPY',
  portugal: 'EUR',
  포르투갈: 'EUR',
  spain: 'EUR',
  스페인: 'EUR',
  france: 'EUR',
  프랑스: 'EUR',
  germany: 'EUR',
  독일: 'EUR',
  thailand: 'THB',
  태국: 'THB',
  vietnam: 'VND',
  베트남: 'VND',
  taiwan: 'TWD',
  대만: 'TWD',
  singapore: 'SGD',
  싱가포르: 'SGD',
  indonesia: 'IDR',
  인도네시아: 'IDR',
  malaysia: 'MYR',
  말레이시아: 'MYR',
  'united states': 'USD',
  usa: 'USD',
  미국: 'USD',
  'united kingdom': 'GBP',
  uk: 'GBP',
  영국: 'GBP',
  canada: 'CAD',
  캐나다: 'CAD',
};

function asCurrencyCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(trimmed)) return null;
  return trimmed;
}

function currencyFromCountry(country: unknown): string | null {
  if (typeof country !== 'string') return null;
  const key = country.trim().toLowerCase();
  return COUNTRY_TO_CURRENCY[key] ?? null;
}

function resolveHomeCurrency(profile: Profile): string {
  const record = profile as Record<string, unknown>;
  return (
    asCurrencyCode(record.home_currency) ??
    asCurrencyCode(record.currency) ??
    currencyFromCountry(record.country) ??
    currencyFromCountry(record.nationality) ??
    DEFAULT_HOME_CURRENCY
  );
}

function resolveHomeCurrencyFromUser(user: User): string {
  const record = user as Record<string, unknown>;
  return (
    asCurrencyCode(record.home_currency) ??
    asCurrencyCode(record.currency) ??
    currencyFromCountry(record.country) ??
    currencyFromCountry(record.nationality) ??
    DEFAULT_HOME_CURRENCY
  );
}

function resolveLocalCurrency(country: string | null | undefined): string {
  return currencyFromCountry(country) ?? DEFAULT_LOCAL_CURRENCY;
}

function formatTopDate(date: Date): string {
  const year = String(date.getFullYear());
  const day = String(date.getDate()).padStart(2, '0');
  const month = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date).toUpperCase();
  return `${year}, ${day} ${month}`;
}

export function ScreenShell({
  children,
  eyebrow,
  title,
  subtitle,
  invertEyebrow = false,
  showLogo = false,
  hideHero = false,
  refreshControl,
}: ScreenShellProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const { state } = useAuth();
  const [fxLabel, setFxLabel] = useState<string>(t('환율 정보 없음', 'FX unavailable'));

  const dayLabel = useMemo(() => formatTopDate(new Date()), []);

  useEffect(() => {
    let cancelled = false;

    const loadFx = async () => {
      try {
        let homeCurrency =
          state.status === 'authenticated'
            ? resolveHomeCurrencyFromUser(state.user)
            : DEFAULT_HOME_CURRENCY;
        let localCurrency = DEFAULT_LOCAL_CURRENCY;

        const [profileResult, staysResult] = await Promise.allSettled([
          fetchProfile(),
          fetchCityStays(),
        ]);

        if (profileResult.status === 'fulfilled') {
          homeCurrency = resolveHomeCurrency(profileResult.value);
        }
        if (staysResult.status === 'fulfilled') {
          const currentStay = staysResult.value.find((s) => s.left_at === null) ?? null;
          localCurrency = resolveLocalCurrency(currentStay?.country);
        }

        if (localCurrency === homeCurrency) {
          if (!cancelled) setFxLabel(`1 ${localCurrency} = 1 ${homeCurrency}`);
          return;
        }

        const res = await fetch(
          `https://api.frankfurter.app/latest?from=${localCurrency}&to=${homeCurrency}`,
        );
        if (!res.ok) {
          throw new Error('FX request failed');
        }

        const data = (await res.json()) as { rates?: Record<string, number> };
        const rate = data.rates?.[homeCurrency];
        if (typeof rate !== 'number' || !Number.isFinite(rate)) {
          throw new Error('FX rate missing');
        }

        const formattedRate = new Intl.NumberFormat(undefined, {
          maximumFractionDigits: homeCurrency === 'KRW' ? 0 : 2,
        }).format(rate);
        if (!cancelled) {
          setFxLabel(`1 ${localCurrency} = ${formattedRate} ${homeCurrency}`);
        }
      } catch {
        if (!cancelled) {
          setFxLabel(t('환율 정보 없음', 'FX unavailable'));
        }
      }
    };

    void loadFx();
    return () => {
      cancelled = true;
    };
  }, [state, t]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View
        style={{
          marginHorizontal: 16,
          marginTop: 10,
          marginBottom: 8,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 14,
          backgroundColor: theme.surfaceMuted,
          paddingHorizontal: 14,
          paddingVertical: 9,
          alignItems: 'center',
          justifyContent: 'space-between',
          flexDirection: 'row',
          gap: 12,
        }}>
        <ThemedText style={{ fontSize: 10, fontWeight: '800', color: theme.textSecondary, letterSpacing: 1.1 }}>
          {dayLabel}
        </ThemedText>
        <ThemedText
          numberOfLines={1}
          style={{ fontSize: 10, fontWeight: '700', color: theme.accent, letterSpacing: 0.4, flexShrink: 1 }}>
          {fxLabel}
        </ThemedText>
      </View>
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4 gap-4 pb-10"
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}>
        {!hideHero ? (
          <View
            style={{
              backgroundColor: theme.surface,
              borderColor: theme.border,
              borderWidth: 1,
              borderRadius: 24,
              overflow: 'hidden',
              padding: 22,
              gap: 10,
            }}>
            <View
              style={{
                position: 'absolute',
                top: -20,
                right: -30,
                width: 140,
                height: 140,
                borderRadius: 70,
                backgroundColor: theme.surfaceSelected,
                opacity: 0.95,
              }}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {showLogo ? <Image source={EarthAssets.logo} style={{ width: 24, height: 24 }} contentFit="contain" /> : null}
              <View
                style={{
                  alignSelf: 'flex-start',
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  borderRadius: 999,
                  backgroundColor: invertEyebrow ? theme.accent : theme.surfaceMuted,
                }}>
                <ThemedText
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: 1.2,
                    color: invertEyebrow ? '#fff' : theme.accent,
                  }}>
                  {eyebrow}
                </ThemedText>
              </View>
            </View>
            <ThemedText style={{ fontSize: 32, lineHeight: 38, fontWeight: '800' }}>{title}</ThemedText>
            <ThemedText style={{ fontSize: 14, lineHeight: 20, fontWeight: '500', color: theme.textSecondary }}>
              {subtitle}
            </ThemedText>
          </View>
        ) : null}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
