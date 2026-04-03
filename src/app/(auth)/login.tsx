import { makeRedirectUri } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { exchangeCodeForToken, fetchMe } from '@/api/auth';
import { ApiError, clearToken, saveToken } from '@/api/client';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useAuth } from '@/store/auth-store';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID_IOS = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS ?? '';
const GOOGLE_CLIENT_ID_ANDROID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID ?? '';
const GOOGLE_CLIENT_ID_WEB = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB ?? '';
const DEV_BYPASS_AUTH_ENABLED = process.env.EXPO_PUBLIC_DEV_BYPASS_AUTH === 'true';
const DEV_MOCK_API_ENABLED = process.env.EXPO_PUBLIC_DEV_MOCK_API === 'true';
const DEV_ACCESS_TOKEN = process.env.EXPO_PUBLIC_DEV_ACCESS_TOKEN ?? '';
const MOCK_TOKEN = 'mock-token';

export default function LoginScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isExpoGo = Constants.appOwnership === 'expo';
  const hasClientIds = Boolean(GOOGLE_CLIENT_ID_IOS && GOOGLE_CLIENT_ID_ANDROID);

  const iosRedirectUri = makeRedirectUri({
    native: 'com.googleusercontent.apps.962318799283-7tsqbo64f14h6hfvgrn8b4fbgp43o6s5:/oauthredirect',
  });

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: isExpoGo ? GOOGLE_CLIENT_ID_WEB || undefined : undefined,
    iosClientId: isExpoGo ? undefined : GOOGLE_CLIENT_ID_IOS || undefined,
    androidClientId: isExpoGo ? undefined : GOOGLE_CLIENT_ID_ANDROID || undefined,
    webClientId: GOOGLE_CLIENT_ID_WEB || undefined,
    redirectUri: isExpoGo ? undefined : iosRedirectUri,
    responseType: 'code',
    shouldAutoExchangeCode: false,
    usePKCE: false,
    scopes: ['openid', 'profile', 'email'],
  });

  useEffect(() => {
    if (!response) return;
    if (response.type === 'error') {
      setError(`${t('구글 OAuth 오류', 'Google OAuth error')}: ${response.error?.message ?? JSON.stringify(response.params)}`);
      return;
    }
    if (response.type === 'dismiss' || response.type === 'cancel') {
      setError(`${t('OAuth 상태', 'OAuth status')}: ${response.type}`);
      return;
    }
    if (response.type !== 'success') {
      return;
    }

    const code = response.params.code;
    if (!code) {
      setError(t('인증 코드를 받지 못했습니다.', 'Missing authorization code.'));
      return;
    }
    if (!request?.redirectUri) {
      setError(t('redirect_uri 생성에 실패했습니다.', 'Failed to create redirect_uri.'));
      return;
    }

    setLoading(true);
    setError(null);

    exchangeCodeForToken(code, request.redirectUri)
      .then(async ({ token, user }) => {
        await saveToken(token);
        login(token, user);
        router.replace('/(tabs)');
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 404) {
          setError(
            t(
              '모바일 로그인 API가 배포되지 않았습니다. 백엔드 /auth/mobile/token 경로를 확인해주세요.',
              'Mobile login API is not deployed. Check backend route: /auth/mobile/token.',
            ),
          );
          return;
        }
        const message = e instanceof Error ? e.message : t('로그인에 실패했습니다.', 'Login failed.');
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [login, request?.redirectUri, response, router, t]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View className="flex-1 items-center justify-center p-6 gap-4">
        <ThemedText className="text-4xl leading-[44px] font-bold">NNAI Nomad</ThemedText>
        <ThemedText className="text-base text-center" style={{ color: theme.textSecondary }}>
          {t('디지털 노마드를 위한 소셜 레이어', 'A social layer for digital nomads')}
        </ThemedText>
        {request?.redirectUri ? (
          <ThemedText className="text-[11px] text-center" style={{ color: theme.textSecondary }}>
            {t('리다이렉트 URI', 'Redirect URI')}: {request.redirectUri}
          </ThemedText>
        ) : null}
        {error ? <ThemedText className="text-sm text-center" style={{ color: theme.destructive }}>{error}</ThemedText> : null}
        <Pressable
          className="w-full rounded-2xl p-4 items-center"
          style={{ backgroundColor: theme.accent }}
          onPress={() => {
            if (isExpoGo) {
              setError(
                t(
                  'Expo Go에서는 Google OAuth 로컬 테스트가 제한됩니다. Development Build(iOS)로 실행해주세요.',
                  'Google OAuth local testing is limited in Expo Go. Run with a Development Build (iOS).',
                ),
              );
              return;
            }
            if (!hasClientIds) {
              setError(
                t(
                  'EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS/ANDROID 값을 .env에 설정해주세요.',
                  'Set EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS/ANDROID in .env.',
                ),
              );
              return;
            }
            void promptAsync();
          }}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText className="text-base font-bold" style={{ color: '#fff' }}>
              {t('Google로 계속하기', 'Continue with Google')}
            </ThemedText>
          )}
        </Pressable>
        {__DEV__ ? (
          <Pressable
            className="w-full rounded-2xl p-4 items-center border"
            style={{ backgroundColor: theme.backgroundElement, borderColor: theme.border }}
            onPress={async () => {
              await saveToken(MOCK_TOKEN);
              login(MOCK_TOKEN, {
                uid: 'mock',
                name: t('모의 사용자', 'Mock User'),
                picture: '',
                email: 'mock@nnai.app',
              });
              router.replace('/(tabs)');
            }}>
            <ThemedText className="text-base font-bold" style={{ color: theme.text }}>
              {t('Mock으로 진입', 'Enter with Mock')}
            </ThemedText>
          </Pressable>
        ) : null}
        {__DEV__ && DEV_BYPASS_AUTH_ENABLED ? (
          <Pressable
            className="w-full rounded-2xl p-4 items-center border"
            style={{ backgroundColor: theme.backgroundElement, borderColor: theme.border }}
            onPress={async () => {
              setError(null);
              setLoading(true);
              try {
                if (DEV_MOCK_API_ENABLED) {
                  await saveToken('dev-token');
                  login('dev-token', {
                    uid: 'dev',
                    name: t('개발 사용자', 'Dev User'),
                    picture: '',
                    email: 'dev@nnai.app',
                  });
                  router.replace('/(tabs)');
                  return;
                }

                if (!DEV_ACCESS_TOKEN) {
                  setError(
                    t(
                      '실제 API 테스트를 위해 EXPO_PUBLIC_DEV_ACCESS_TOKEN 값을 설정해주세요.',
                      'Set EXPO_PUBLIC_DEV_ACCESS_TOKEN for real API testing.',
                    ),
                  );
                  return;
                }

                await saveToken(DEV_ACCESS_TOKEN);
                const user = await fetchMe();
                login(DEV_ACCESS_TOKEN, user);
                router.replace('/(tabs)');
              } catch (e: unknown) {
                await clearToken();
                const message = e instanceof Error ? e.message : t('Dev 진입에 실패했습니다.', 'Failed to enter Dev mode.');
                setError(message);
              } finally {
                setLoading(false);
              }
            }}>
            <ThemedText className="text-base font-bold" style={{ color: theme.text }}>
              {DEV_MOCK_API_ENABLED
                ? t('Dev 모드로 진입 (Mock)', 'Enter Dev Mode (Mock)')
                : t('Dev 모드로 진입 (실제 API)', 'Enter Dev Mode (Real API)')}
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
