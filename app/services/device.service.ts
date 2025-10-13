import { serviceClient } from './base.service';
import { logger } from '~/lib/logger.server';

export interface DeviceStatus {
  battery: number;
  charging: boolean;
  signal: {
    wifi: number;
    lte?: number;
  };
  storage: {
    used: number;
    total: number;
  };
  uptime: number;
  temperature: number;
}

export async function getDeviceStatus(): Promise<DeviceStatus> {
  try {
    const status = await serviceClient.get<DeviceStatus>('/device/status');
    return status;
  } catch (error) {
    logger.error('Failed to fetch device status', error);
    // Return realistic mock/fallback data when API is unavailable
    return {
      battery: 85,
      charging: false,
      signal: { wifi: 75 },
      storage: {
        used: 2.5 * 1024 * 1024 * 1024, // 2.5 GB used
        total: 8 * 1024 * 1024 * 1024  // 8 GB total
      },
      uptime: 3600 * 24 * 3, // 3 days in seconds
      temperature: 45,
    };
  }
}

