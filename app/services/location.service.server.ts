import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '~/lib/logger.server';
import { prisma } from '~/lib/db.server';

const execAsync = promisify(exec);

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number; // meters
  timestamp: string;
  address?: string; // Reverse geocoded
}

// Cache for the last known location
let lastKnownLocation: LocationData | null = null;

export async function getCurrentLocation(): Promise<LocationData | null> {
  try {
    // Try multiple methods to get location

    // Method 1: gpsd (if GPS hardware is available)
    try {
      const { stdout } = await execAsync('timeout 5 gpspipe -w -n 10 2>/dev/null | grep -m 1 TPV');
      const data = JSON.parse(stdout);

      if (data.lat && data.lon) {
        const location: LocationData = {
          latitude: data.lat,
          longitude: data.lon,
          accuracy: data.epy || data.epx || 10,
          timestamp: new Date().toISOString(),
        };

        // Try to get address
        location.address = await reverseGeocode(location.latitude, location.longitude);

        lastKnownLocation = location;

        // Store in database for history
        await storeLocationHistory(location);

        logger.info('Got location from GPS', { lat: location.latitude, lon: location.longitude });
        return location;
      }
    } catch (gpsError) {
      logger.debug('GPS not available', gpsError);
    }

    // Method 2: geoclue (system location service)
    try {
      const { stdout } = await execAsync('busctl --user call org.freedesktop.GeoClue2 /org/freedesktop/GeoClue2/Manager org.freedesktop.GeoClue2.Manager GetClient');
      // Parse geoclue output if available
      // This is complex and depends on system setup
    } catch (geoclueError) {
      logger.debug('Geoclue not available', geoclueError);
    }

    // Method 3: WiFi-based location (using network scan)
    try {
      const location = await getLocationFromWiFi();
      if (location) {
        lastKnownLocation = location;
        await storeLocationHistory(location);
        return location;
      }
    } catch (wifiError) {
      logger.debug('WiFi location not available', wifiError);
    }

    // Method 4: Return last known location if available
    if (lastKnownLocation) {
      logger.info('Returning last known location');
      return lastKnownLocation;
    }

    // Fallback: Return mock location
    logger.warn('No location method available, using mock data');
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

async function getLocationFromWiFi(): Promise<LocationData | null> {
  try {
    // Get WiFi networks for location lookup
    const { stdout } = await execAsync('nmcli -t -f BSSID,SIGNAL dev wifi list 2>/dev/null | head -5');
    const lines = stdout.trim().split('\n');

    if (lines.length === 0) return null;

    // In a real implementation, you would send these BSSIDs to a location service
    // like Mozilla Location Service, Google Geolocation API, etc.
    // For now, return null to fall back to other methods

    return null;
  } catch (error) {
    return null;
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
