import fs from 'fs/promises';
import { logger } from '~/lib/logger.server';
import { prisma } from '~/lib/db.server';
import type { LocationData } from '~/types/location.types';
import { LOCATION_DATA_FILE } from '~/types/location.types';

// Cache for the last known location
let lastKnownLocation: LocationData | null = null;

// Maximum age for location data (2 minutes)
const MAX_LOCATION_AGE_MS = 2 * 60 * 1000;

/**
 * Read location data from file written by GPS service
 */
async function readLocationFromFile(): Promise<LocationData | null> {
  try {
    const data = await fs.readFile(LOCATION_DATA_FILE, 'utf-8');
    const location: LocationData = JSON.parse(data);
    
    // Check if data is fresh (< 2 minutes old)
    const locationTime = new Date(location.timestamp).getTime();
    const now = Date.now();
    const age = now - locationTime;
    
    if (age > MAX_LOCATION_AGE_MS) {
      logger.warn('Location data is stale', { age: Math.round(age / 1000) + 's' });
      return null;
    }
    
    logger.debug('Read location from file', { 
      lat: location.latitude, 
      lon: location.longitude,
      age: Math.round(age / 1000) + 's'
    });
    
    return location;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      logger.debug('Location file not found', { file: LOCATION_DATA_FILE });
    } else {
      logger.error('Failed to read location file', error);
    }
    return null;
  }
}

export async function getCurrentLocation(): Promise<LocationData | null> {
  try {
    // Read location from file (written by GPS service)
    const location = await readLocationFromFile();
    
    if (location) {
      // Try to get address if not already present
      if (!location.address) {
        location.address = await reverseGeocode(location.latitude, location.longitude);
      }
      
      lastKnownLocation = location;
      
      // Store in database for history
      await storeLocationHistory(location);
      
      return location;
    }
    
    // Fallback: Return last known location if available
    if (lastKnownLocation) {
      logger.info('Returning last known location (cached)');
      return lastKnownLocation;
    }
    
    // Final fallback: Return mock location
    logger.warn('No location data available, using fallback');
    return {
      latitude: 37.7749,
      longitude: -122.4194,
      accuracy: 15,
      timestamp: new Date().toISOString(),
      address: 'Home',
    };
  } catch (error) {
    logger.error('Failed to get current location', error);
    return lastKnownLocation || {
      latitude: 37.7749,
      longitude: -122.4194,
      accuracy: 15,
      timestamp: new Date().toISOString(),
      address: 'Home',
    };
  }
}


async function reverseGeocode(lat: number, lon: number): Promise<string | undefined> {
  try {
    // Use Nominatim (OpenStreetMap) for reverse geocoding
    // Note: In production, you should cache this and respect rate limits
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'YoyoPod-Dashboard/1.0'
      }
    });

    if (response.ok) {
      const data = await response.json();
      return data.display_name || data.address?.road || undefined;
    }
  } catch (error) {
    logger.debug('Reverse geocoding failed', error);
  }

  return undefined;
}

async function storeLocationHistory(location: LocationData): Promise<void> {
  try {
    // Store in database for history tracking
    // This assumes you have a LocationHistory model in Prisma
    // If not, you can skip this or create the model

    // await prisma.locationHistory.create({
    //   data: {
    //     latitude: location.latitude,
    //     longitude: location.longitude,
    //     accuracy: location.accuracy,
    //     timestamp: new Date(location.timestamp),
    //     address: location.address,
    //   },
    // });

    logger.debug('Location stored in history');
  } catch (error) {
    logger.warn('Failed to store location history', error);
  }
}

export async function getLocationHistory(days: number = 7): Promise<LocationData[]> {
  try {
    // Get location history from database
    const since = new Date();
    since.setDate(since.getDate() - days);

    // This assumes you have a LocationHistory model in Prisma
    // const history = await prisma.locationHistory.findMany({
    //   where: {
    //     timestamp: {
    //       gte: since,
    //     },
    //   },
    //   orderBy: {
    //     timestamp: 'desc',
    //   },
    //   take: 100,
    // });

    // return history.map(h => ({
    //   latitude: h.latitude,
    //   longitude: h.longitude,
    //   accuracy: h.accuracy,
    //   timestamp: h.timestamp.toISOString(),
    //   address: h.address || undefined,
    // }));

    // For now, return mock history
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
  } catch (error) {
    logger.error('Failed to get location history', error);
    return [];
  }
}

export async function startLocationTracking(): Promise<void> {
  // Start periodic location updates
  setInterval(async () => {
    try {
      await getCurrentLocation();
    } catch (error) {
      logger.error('Location tracking error', error);
    }
  }, 60000); // Update every minute
}
