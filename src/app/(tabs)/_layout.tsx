import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { useI18n } from '@/i18n';

export default function TabsLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { t } = useI18n();

  return (
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
          title: t('피드', 'Feed'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons color={color} name="home-variant-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: t('탐색', 'Discover'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons color={color} name="compass-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="plans"
        options={{
          title: t('플랜', 'Moves'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons color={color} name="briefcase-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('프로필', 'Profile'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons color={color} name="account-circle-outline" size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
