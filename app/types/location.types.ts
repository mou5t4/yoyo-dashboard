/**
 * Location data structure that mirrors what a GPS module would provide.
 * This interface is used by both mock and real GPS services.
 */
export interface LocationData {
  /** Latitude in decimal degrees (-90 to 90) */
  latitude: number;
  
  /** Longitude in decimal degrees (-180 to 180) */
  longitude: number;
  
  /** Horizontal accuracy/precision in meters */
  accuracy: number;
  
  /** Altitude above sea level in meters (optional) */
  altitude?: number;
  
  /** Speed in meters per second (optional) */
  speed?: number;
  
  /** Heading/bearing in degrees (0-360, 0=North, 90=East) */
  heading?: number;
  
  /** Number of satellites used for fix (optional) */
  satellites?: number;
  
  /** Human-readable address from reverse geocoding (optional) */
  address?: string;
  
  /** ISO 8601 timestamp when this location was recorded */
  timestamp: string;
}

/**
 * Location file location
 * Development: Uses /tmp/yoyo/location.json
 * Production: Can use /run/yoyo/location.json (tmpfs) with proper permissions
 */
export const LOCATION_DATA_FILE = process.env.LOCATION_DATA_FILE || '/tmp/yoyo/location.json';

