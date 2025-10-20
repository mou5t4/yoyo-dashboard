export const APP_NAME = 'YoyoPod';
export const APP_VERSION = '1.0.0';

export const SESSION_COOKIE_NAME = 'yoyopod_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

export const DEFAULT_PASSWORD = 'yoyopod2024';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
export const WEAK_PASSWORDS = ['password', 'admin', '12345678', 'yoyopod', 'yoyopod2024'];

export const RATE_LIMIT = {
  LOGIN_MAX_ATTEMPTS: 5,
  LOGIN_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
};

export const DEVICE_VARIANTS = {
  CORE: 'core',
  CALL: 'call',
  AI: 'ai',
} as const;

export const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const VOLUME_MIN = 0;
export const VOLUME_MAX = 100;
export const VOLUME_DEFAULT = 80;

export const POLL_INTERVAL = 30000; // 30 seconds

export const SECURITY_TYPES = ['open', 'wep', 'wpa', 'wpa2'] as const;

export const CONTACT_RELATIONSHIPS = [
  'parent',
  'grandparent',
  'sibling',
  'aunt/uncle',
  'friend',
  'other',
] as const;

export const AI_SAFETY_LEVELS = ['strict', 'moderate', 'light'] as const;

export const CONTENT_TYPES = ['playlist', 'podcast', 'album'] as const;

