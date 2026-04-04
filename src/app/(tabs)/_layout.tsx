import { Tabs, usePathname } from 'expo-router';
import React, { useMemo } from 'react';
import { Text, useColorScheme, View } from 'react-native';

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
    if (pathname.includes('city')) return 'city';
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
            fontFamily: 'monospace',
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: t('피드', 'Feed'),
            tabBarIcon: ({ color }) => <TabIcon label="F" color={color} />,
          }}
        />
        <Tabs.Screen
          name="city"
          options={{
            title: t('국가', 'Countries'),
            tabBarIcon: ({ color }) => <TabIcon label="C" color={color} />,
          }}
        />
        <Tabs.Screen
          name="me"
          options={{
            title: t('나', 'Me'),
            tabBarIcon: ({ color }) => <TabIcon label="M" color={color} />,
          }}
        />
      </Tabs>
      <FloatingCompanion context={companionContext} />
    </View>
  );
}

function TabIcon({ label, color }: { label: string; color: string }) {
  return (
    <View
      style={{
        width: 28,
        height: 28,
        borderWidth: 1,
        borderColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text style={{ color, fontSize: 14, fontFamily: 'monospace', fontWeight: '700' }}>{label}</Text>
    </View>
  );
}
