import { Tabs, usePathname } from 'expo-router';
import React, { useMemo } from 'react';
import { useColorScheme, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { FloatingCompanion } from '@/components/floating-companion';
import type { CompanionContext } from '@/constants/companion-messages';
import { Colors } from '@/constants/theme';
import { useI18n } from '@/i18n';

export default function TabsLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { t } = useI18n();
  const pathname = usePathname();
  const companionContext: CompanionContext = useMemo(() => {
    if (pathname.includes('connect')) return 'city';
    if (pathname.includes('me')) return 'me';
    return 'feed';
  }, [pathname]);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: {
            backgroundColor: colors.backgroundElement,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            height: 84,
            paddingBottom: 10,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '700',
          },
        }}>
        <Tabs.Screen
          name="timeline"
          options={{
            title: t('타임라인', 'Timeline'),
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons color={color} name="timeline-outline" size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="connect"
          options={{
            title: t('연결', 'Connect'),
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons color={color} name="transit-connection-variant" size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="alerts"
          options={{
            title: t('알림', 'Alerts'),
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons color={color} name="alert-outline" size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="me"
          options={{
            title: t('캐릭터', 'Character'),
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons color={color} name="account-circle-outline" size={size} />
            ),
          }}
        />
      </Tabs>
      <FloatingCompanion context={companionContext} />
    </View>
  );
}
