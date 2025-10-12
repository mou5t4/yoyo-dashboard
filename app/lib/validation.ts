import { z } from 'zod';
import { PASSWORD_MIN_LENGTH, PASSWORD_PATTERN, WEAK_PASSWORDS } from './constants';

// Authentication schemas
export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean().optional(),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().optional(),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
    .regex(PASSWORD_PATTERN, 'Password must contain uppercase, lowercase, and number')
    .refine((val) => !WEAK_PASSWORDS.includes(val.toLowerCase()), {
      message: 'This password is too weak',
    }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Settings schemas
export const generalSettingsSchema = z.object({
  deviceName: z.string().min(1, 'Device name is required').max(50),
  childName: z.string().max(50).optional(),
  maxVolume: z.number().min(0).max(100),
  dailyUsageLimit: z.number().min(0).max(1440).optional().nullable(),
  bedtimeStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional().nullable(),
  bedtimeEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional().nullable(),
  contentFilterEnabled: z.boolean(),
  explicitContentBlocked: z.boolean(),
});

// WiFi schemas
export const wifiConnectSchema = z.object({
  ssid: z.string().min(1, 'Network name is required'),
  password: z.string().optional(),
  security: z.enum(['open', 'wep', 'wpa', 'wpa2']),
});

// Contact schemas
export const contactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  phoneNumber: z.string().regex(/^\+?[\d\s()-]+$/, 'Invalid phone number'),
  relationship: z.string().optional(),
  isPrimary: z.boolean().default(false),
  canCall: z.boolean().default(true),
  canReceive: z.boolean().default(true),
  quickDial: z.number().min(1).max(9).optional().nullable(),
});

// Geofence schemas
export const geofenceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius: z.number().min(10).max(10000), // 10m to 10km
  enabled: z.boolean().default(true),
  alertOnExit: z.boolean().default(true),
  alertOnEnter: z.boolean().default(false),
});

// Schedule schemas
export const scheduleSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  allowMusic: z.boolean().default(true),
  allowPodcasts: z.boolean().default(true),
  allowAI: z.boolean().default(false),
  enabled: z.boolean().default(true),
});

// AI settings schemas
export const aiSettingsSchema = z.object({
  aiEnabled: z.boolean(),
  aiDailyLimit: z.number().min(0).max(1440).optional().nullable(),
  aiTopicFilters: z.array(z.string()).optional(),
  conversationLogging: z.boolean(),
});

// Location settings schemas
export const locationSettingsSchema = z.object({
  locationEnabled: z.boolean(),
  geofencingEnabled: z.boolean(),
});

// Type exports
export type LoginInput = z.infer<typeof loginSchema>;
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
export type GeneralSettingsInput = z.infer<typeof generalSettingsSchema>;
export type WiFiConnectInput = z.infer<typeof wifiConnectSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type GeofenceInput = z.infer<typeof geofenceSchema>;
export type ScheduleInput = z.infer<typeof scheduleSchema>;
export type AISettingsInput = z.infer<typeof aiSettingsSchema>;
export type LocationSettingsInput = z.infer<typeof locationSettingsSchema>;

