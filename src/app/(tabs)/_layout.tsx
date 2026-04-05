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
            height: 86,
            paddingBottom: 8,
            paddingTop: 10,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '700',
            letterSpacing: 0.5,
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: t('턴', 'Turn'),
            tabBarIcon: ({ color }) => <TabIcon label="T" color={color} />,
          }}
        />
        <Tabs.Screen
          name="city"
          options={{
            title: t('도시', 'City'),
            tabBarIcon: ({ color }) => <TabIcon label="C" color={color} />,
          }}
        />
        <Tabs.Screen
          name="me"
          options={{
            title: t('캐릭터', 'Character'),
            tabBarIcon: ({ color }) => <TabIcon label="R" color={color} />,
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
        width: 30,
        height: 30,
        borderWidth: 1,
        borderColor: color,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
      }}>
      <Text style={{ color, fontSize: 13, fontWeight: '800' }}>{label}</Text>
    </View>
  );
}
