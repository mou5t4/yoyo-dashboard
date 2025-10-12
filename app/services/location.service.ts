import { serviceClient } from './base.service';
import { logger } from '~/lib/logger';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number; // meters
  timestamp: string;
  address?: string; // Reverse geocoded
}

export async function getCurrentLocation(): Promise<LocationData | null> {
  try {
    const location = await serviceClient.get<LocationData>('/location/current');
    return location;
  } catch (error) {
    logger.error('Failed to get current location', error);
    return null;
  }
}

export async function getLocationHistory(days: number = 7): Promise<LocationData[]> {
  try {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const history = await serviceClient.get<LocationData[]>(
      `/location/history?since=${since.toISOString()}`
    );
    return history;
  } catch (error) {
    logger.error('Failed to get location history', error);
    return [];
  }
}

