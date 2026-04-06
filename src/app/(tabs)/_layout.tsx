import { Tabs, usePathname } from 'expo-router';
import React, { useMemo } from 'react';
import { Text, useColorScheme, View } from 'react-native';
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
  const tabIndicator = useMemo(() => {
    if (pathname.includes('city')) return t('도시 운영', 'City Ops');
    if (pathname.includes('me')) return t('캐릭터', 'Character');
    return t('오늘의 턴', 'Today Turn');
  }, [pathname, t]);
  const companionContext: CompanionContext = useMemo(() => {
    if (pathname.includes('city')) return 'city';
    if (pathname.includes('me')) return 'me';
    return 'feed';
  }, [pathname]);

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 6,
          backgroundColor: colors.background,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}>
        <Text style={{ color: colors.textSecondary, fontSize: 11, letterSpacing: 1.2, fontWeight: '700' }}>
          {tabIndicator.toUpperCase()}
        </Text>
      </View>
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
          name="index"
          options={{
            title: t('턴', 'Turn'),
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons color={color} name="clipboard-check-outline" size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="city"
          options={{
            title: t('도시', 'City'),
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons color={color} name="map-marker-outline" size={size} />
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
