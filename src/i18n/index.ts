import { getLocales } from 'expo-localization';

export type AppLanguage = 'ko' | 'en';

function detectSystemLocale(): string {
  const locales = getLocales();
  const localeFromExpo = locales[0]?.languageTag || locales[0]?.languageCode;
  if (localeFromExpo) {
    return localeFromExpo;
  }

  const intlLocale = Intl.DateTimeFormat().resolvedOptions().locale;
  if (intlLocale) {
    return intlLocale;
  }

  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language;
  }

  return 'en';
}

export function getAppLanguage(): AppLanguage {
  const locale = detectSystemLocale().toLowerCase();
  return locale.startsWith('ko') ? 'ko' : 'en';
}

export function useI18n() {
  const language = getAppLanguage();

  return {
    language,
    isKorean: language === 'ko',
    t: (ko: string, en: string) => (language === 'ko' ? ko : en),
  };
}
