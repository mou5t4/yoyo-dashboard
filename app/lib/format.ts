/**
 * Locale-aware formatting utilities
 * Provides consistent date, time, number, and file size formatting across languages
 */

import { format as formatDate } from 'date-fns';
import { enUS, es, de, fr, ar, it, zhCN, faIR } from 'date-fns/locale';
import type { SupportedLanguage } from '~/i18n';

// Map language codes to date-fns locales
const localeMap = {
  en: enUS,
  es: es,
  de: de,
  fr: fr,
  ar: ar,
  it: it,
  zh: zhCN,
  fa: faIR,
} as const;

/**
 * Format a date/time according to locale
 */
export function formatDateTime(
  date: Date,
  locale: SupportedLanguage,
  pattern?: string
): string {
  const dateFnsLocale = localeMap[locale] || enUS;
  
  // Use locale-appropriate patterns for RTL languages
  if (!pattern) {
    switch (locale) {
      case 'ar':
        // Arabic: use Arabic pattern with proper RTL ordering
        pattern = 'PPPP p';
        break;
      case 'fa':
        // Persian: use Persian pattern with proper RTL ordering
        pattern = 'PPPP p';
        break;
      default:
        // English and other LTR languages: use English "at" pattern
        pattern = 'PPPP \'at\' p';
        break;
    }
  }
  
  return formatDate(date, pattern, { locale: dateFnsLocale });
}

/**
 * Format a date only (no time)
 */
export function formatDateOnly(
  date: Date,
  locale: SupportedLanguage,
  pattern: string = 'PPP'
): string {
  const dateFnsLocale = localeMap[locale] || enUS;
  return formatDate(date, pattern, { locale: dateFnsLocale });
}

/**
 * Format time only (no date)
 */
export function formatTimeOnly(
  date: Date,
  locale: SupportedLanguage,
  pattern: string = 'p'
): string {
  const dateFnsLocale = localeMap[locale] || enUS;
  return formatDate(date, pattern, { locale: dateFnsLocale });
}

/**
 * Format a number according to locale
 */
export function formatNumber(
  value: number,
  locale: SupportedLanguage,
  options?: Intl.NumberFormatOptions
): string {
  const localeCode = locale === 'zh' ? 'zh-CN' : locale === 'fa' ? 'fa-IR' : locale;
  return new Intl.NumberFormat(localeCode, options).format(value);
}

/**
 * Format file size (bytes) to human-readable format
 */
export function formatFileSize(bytes: number, locale: SupportedLanguage): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  const formatted = formatNumber(size, locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  
  return `${formatted} ${units[unitIndex]}`;
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, locale: SupportedLanguage): string {
  return formatNumber(value, locale, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * Format duration (minutes to human-readable)
 */
export function formatDuration(minutes: number, locale: SupportedLanguage, t: (key: string, options?: any) => string): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return t('time.minutesShort', { count: mins });
  }
  
  if (mins === 0) {
    return t('time.hoursShort', { count: hours });
  }
  
  return `${hours}${t('time.hourAbbrev')} ${mins}${t('time.minuteAbbrev')}`;
}


