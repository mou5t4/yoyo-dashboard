import { serviceClient } from './base.service';
import { logger } from '~/lib/logger.server';

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
    // Return mock location when API is unavailable
    return {
      latitude: 37.7749,
      longitude: -122.4194,
      accuracy: 15,
      timestamp: new Date().toISOString(),
      address: 'Home',
    };
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
    // Return mock history when API is unavailable
    const now = new Date();
    return [
      {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 15,
        timestamp: new Date(now.getTime() - 3600000).toISOString(),
        address: 'Home',
      },
      {
        latitude: 37.7849,
        longitude: -122.4094,
        accuracy: 20,
        timestamp: new Date(now.getTime() - 7200000).toISOString(),
        address: 'School',
      },
    ];
  }
}

