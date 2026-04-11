import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import '@/global.css';
import { LoadingScreen } from '@/components/loading-screen';
import { TypeGate } from '@/components/type-gate';
import { Colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/store/auth-store';

void SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { state } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (state.status === 'loading') {
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';

    if (state.status === 'unauthenticated' && !inAuthGroup) {
      router.replace('/(auth)/login');
    }

    if (state.status === 'authenticated' && inAuthGroup) {
      router.replace('/(tabs)/timeline');
    }
  }, [router, segments, state.status]);

  useEffect(() => {
    if (state.status !== 'loading') {
      void SplashScreen.hideAsync();
    }
  }, [state.status]);

  if (state.status === 'loading') {
    return <LoadingScreen />;
  }

  if (state.status === 'authenticated' && state.user.persona_type === null) {
    return <TypeGate />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="compose" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];
  const navigationTheme = {
    ...(scheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(scheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      card: colors.backgroundElement,
      border: colors.border,
      notification: colors.accent,
      primary: colors.accent,
      text: colors.text,
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      <AuthProvider>
        <RootLayoutNav />
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      </AuthProvider>
    </ThemeProvider>
  );
}
