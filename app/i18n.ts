// Shared i18n configuration for client and server
export const supportedLanguages = {
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  ar: 'العربية',
  it: 'Italiano',
  es: 'Español',
  zh: '中文',
  fa: 'فارسی',
} as const;

export type SupportedLanguage = keyof typeof supportedLanguages;

export const rtlLanguages: SupportedLanguage[] = ['ar', 'fa'];

export const defaultLanguage: SupportedLanguage = 'en';
export const fallbackLanguage: SupportedLanguage = 'en';

export function isRTL(language: string): boolean {
  return rtlLanguages.includes(language as SupportedLanguage);
}


