import { Image } from 'expo-image';
import React, { useCallback } from 'react';
import { Linking, Pressable, View } from 'react-native';

import { fetchMe } from '@/api/auth';
import { getToken } from '@/api/client';
import { ThemedText } from '@/components/themed-text';
import { EarthAssets } from '@/constants/nomad-types';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useAuth } from '@/store/auth-store';

export function TypeGate() {
  const theme = useTheme();
  const { t } = useI18n();
  const { login } = useAuth();

  const openTypeQuiz = useCallback(() => {
    void Linking.openURL('https://nnai.app/type-quiz');
  }, []);

  const refresh = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const user = await fetchMe();
      if (user.nomad_type) {
        login(token, user);
      }
    } catch {
      // silently fail
    }
  }, [login]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.background,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        gap: 24,
      }}>
      <Image source={EarthAssets.fullGif} style={{ width: 100, height: 100 }} contentFit="contain" />

      <ThemedText style={{ fontSize: 18, fontWeight: 'bold', textAlign: 'center' }}>
        {t('아직 노마드 타입이 정해지지 않았어요', "Your nomad type hasn't been set yet")}
      </ThemedText>

      <View
        style={{
          backgroundColor: theme.backgroundElement,
          borderWidth: 1,
          borderColor: theme.border,
          padding: 12,
          maxWidth: 240,
        }}>
        <ThemedText style={{ fontSize: 11, color: theme.textSecondary, textAlign: 'center' }}>
          {t('nnai.app에서 나만의 타입을 찾아보세요!', 'Find your type at nnai.app!')}
        </ThemedText>
      </View>

      <Pressable
        onPress={openTypeQuiz}
        style={{
          backgroundColor: theme.accent,
          paddingHorizontal: 24,
          paddingVertical: 12,
        }}>
        <ThemedText style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>
          {t('타입 찾으러 가기', 'Find my type')}
        </ThemedText>
      </Pressable>

      <Pressable onPress={refresh}>
        <ThemedText style={{ color: theme.accent, fontSize: 12 }}>
          {t('이미 했어요 — 새로고침', 'Already done — refresh')}
        </ThemedText>
      </Pressable>
    </View>
  );
}
