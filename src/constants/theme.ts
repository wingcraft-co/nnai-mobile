/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#333333',
    background: '#f8f8f8',
    backgroundElement: '#f2f2f2',
    backgroundSelected: '#e8e5e0',
    textSecondary: '#555555',
    accent: '#c47a1a',
    destructive: '#c53030',
    border: '#d5cfc5',
  },
  dark: {
    text: '#f3f3f3',
    background: '#1a1a1a',
    backgroundElement: '#2a2a2a',
    backgroundSelected: '#3a3a3a',
    textSecondary: '#999999',
    accent: '#d4952a',
    destructive: '#e05050',
    border: '#4a4540',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-sans)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-sans)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
