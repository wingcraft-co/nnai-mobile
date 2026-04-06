/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#101418',
    background: '#f4f6f9',
    surface: '#ffffff',
    surfaceMuted: '#eef2f6',
    surfaceSelected: '#e4edf8',
    surfaceRaised: '#f8fbff',
    backgroundElement: '#ffffff',
    backgroundSelected: '#e4edf8',
    textSecondary: '#5e6a78',
    accent: '#0a84ff',
    destructive: '#ff3b30',
    success: '#2ebd85',
    border: '#d9e1ea',
  },
  dark: {
    text: '#f2f5f8',
    background: '#0d1117',
    surface: '#161b22',
    surfaceMuted: '#1d2630',
    surfaceSelected: '#223247',
    surfaceRaised: '#1b2430',
    backgroundElement: '#161b22',
    backgroundSelected: '#223247',
    textSecondary: '#a6b1bc',
    accent: '#4da3ff',
    destructive: '#ff6b63',
    success: '#3bcf95',
    border: '#2b3440',
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
