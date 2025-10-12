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
    // Return fallback data
    return {
      battery: 0,
      charging: false,
      signal: { wifi: 0 },
      storage: { used: 0, total: 0 },
      uptime: 0,
      temperature: 0,
    };
  }
}

