#!/usr/bin/env tsx
/**
 * Mock GPS Service
 * 
 * Simulates a real GPS module by writing location data to /tmp/yoyo/location.json.
 * This service can be replaced with a real GPS service without changing dashboard code.
 * 
 * Features:
 * - Random walk simulation around a center point
 * - Realistic GPS drift and accuracy variations
 * - Speed and heading calculations
 * - Atomic file writes (no corruption)
 * - Graceful shutdown
 * - Signal-based control (USR1 = toggle GPS, USR2 = reset)
 */

import fs from 'fs/promises';
import path from 'path';
import type { LocationData } from '../app/types/location.types.js';
import { LOCATION_DATA_FILE } from '../app/types/location.types.js';

// Configuration from environment variables
const UPDATE_INTERVAL = parseInt(process.env.LOCATION_UPDATE_INTERVAL || '30000'); // 30 seconds
const CENTER_LAT = parseFloat(process.env.GPS_CENTER_LAT || '37.7749'); // San Francisco
const CENTER_LON = parseFloat(process.env.GPS_CENTER_LON || '-122.4194');
const WALK_RADIUS = parseFloat(process.env.GPS_WALK_RADIUS || '500'); // meters

// GPS state
let gpsState = {
  latitude: CENTER_LAT,
  longitude: CENTER_LON,
  altitude: 15, // meters above sea level
  accuracy: 10,
  speed: 0, // m/s
  heading: 0, // degrees
  satellites: 8,
  enabled: true,
  lastLat: CENTER_LAT,
  lastLon: CENTER_LON,
  lastUpdateTime: Date.now(),
};

/**
 * Convert meters to degrees (approximate at mid-latitudes)
 * 1 degree latitude ≈ 111,320 meters
 * 1 degree longitude ≈ 111,320 * cos(latitude) meters
 */
function metersToDegrees(meters: number, latitude: number): { lat: number; lon: number } {
  const latDegrees = meters / 111320;
  const lonDegrees = meters / (111320 * Math.cos(latitude * Math.PI / 180));
  return { lat: latDegrees, lon: lonDegrees };
}

/**
 * Calculate distance between two points in meters (Haversine formula)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculate bearing/heading from one point to another
 */
function calculateHeading(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) -
            Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);

  return (θ * 180 / Math.PI + 360) % 360; // Convert to degrees (0-360)
}

/**
 * Perform random walk - move to a new position near the current one
 */
function randomWalk() {
  if (!gpsState.enabled) {
    // GPS is disabled, don't update position
    return;
  }

  // Random walk: small random movement
  const maxStepMeters = 50; // Maximum step size in meters
  const stepMeters = Math.random() * maxStepMeters;
  const stepDirection = Math.random() * 2 * Math.PI; // Random direction in radians

  // Calculate step in latitude/longitude
  const stepLat = stepMeters * Math.cos(stepDirection) / 111320;
  const stepLon = stepMeters * Math.sin(stepDirection) / (111320 * Math.cos(gpsState.latitude * Math.PI / 180));

  // Store last position for speed/heading calculation
  gpsState.lastLat = gpsState.latitude;
  gpsState.lastLon = gpsState.longitude;
  const lastUpdateTime = gpsState.lastUpdateTime;
  gpsState.lastUpdateTime = Date.now();

  // Apply the step
  let newLat = gpsState.latitude + stepLat;
  let newLon = gpsState.longitude + stepLon;

  // Check if we're still within the walk radius from center
  const distanceFromCenter = calculateDistance(CENTER_LAT, CENTER_LON, newLat, newLon);
  
  if (distanceFromCenter > WALK_RADIUS) {
    // Pull back towards center with some randomness
    const pullStrength = 0.3 + Math.random() * 0.4; // 30-70% pull back
    newLat = gpsState.latitude + (CENTER_LAT - gpsState.latitude) * pullStrength;
    newLon = gpsState.longitude + (CENTER_LON - gpsState.longitude) * pullStrength;
  }

  // Calculate speed (m/s)
  const distance = calculateDistance(gpsState.lastLat, gpsState.lastLon, newLat, newLon);
  const timeElapsed = (gpsState.lastUpdateTime - lastUpdateTime) / 1000; // seconds
  gpsState.speed = timeElapsed > 0 ? distance / timeElapsed : 0;

  // Calculate heading
  if (distance > 0.5) { // Only update heading if we moved more than 0.5m
    gpsState.heading = calculateHeading(gpsState.lastLat, gpsState.lastLon, newLat, newLon);
  }

  // Update position
  gpsState.latitude = newLat;
  gpsState.longitude = newLon;

  // Simulate GPS accuracy variations (5-50 meters)
  gpsState.accuracy = 5 + Math.random() * 45;

  // Simulate satellite count variations (6-12 satellites)
  gpsState.satellites = Math.floor(6 + Math.random() * 7);

  // Simulate altitude variations (±5 meters)
  gpsState.altitude += (Math.random() - 0.5) * 2;
  gpsState.altitude = Math.max(0, gpsState.altitude); // Don't go below sea level
}

/**
 * Get current location data
 */
function getLocationData(): LocationData {
  return {
    latitude: Math.round(gpsState.latitude * 1000000) / 1000000, // 6 decimal places
    longitude: Math.round(gpsState.longitude * 1000000) / 1000000,
    accuracy: Math.round(gpsState.accuracy * 10) / 10,
    altitude: Math.round(gpsState.altitude * 10) / 10,
    speed: Math.round(gpsState.speed * 10) / 10,
    heading: Math.round(gpsState.heading),
    satellites: gpsState.satellites,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Write location data to file atomically
 */
async function writeLocationData(data: LocationData): Promise<void> {
  const dir = path.dirname(LOCATION_DATA_FILE);
  
  // Ensure directory exists
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore
  }
  
  // Write atomically: write to temp file, then rename
  const tempFile = `${LOCATION_DATA_FILE}.tmp`;
  const jsonData = JSON.stringify(data, null, 2);
  
  await fs.writeFile(tempFile, jsonData, 'utf-8');
  await fs.rename(tempFile, LOCATION_DATA_FILE);
}

/**
 * Main update loop
 */
async function updateLoop() {
  try {
    if (gpsState.enabled) {
      randomWalk();
    }
    
    const data = getLocationData();
    await writeLocationData(data);
    
    const status = gpsState.enabled ? 'active' : 'disabled';
    console.log(
      `[${new Date().toISOString()}] GPS ${status}: ` +
      `${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)} | ` +
      `±${data.accuracy.toFixed(1)}m | ${data.satellites} sats | ` +
      `${data.speed?.toFixed(1)}m/s | ${data.heading}°`
    );
  } catch (error) {
    console.error('Error updating location data:', error);
  }
}

/**
 * Signal handlers for manual control
 */
function setupSignalHandlers() {
  // SIGUSR1: Toggle GPS on/off
  process.on('SIGUSR1', () => {
    gpsState.enabled = !gpsState.enabled;
    console.log(`Signal received: GPS ${gpsState.enabled ? 'enabled' : 'disabled'}`);
  });
  
  // SIGUSR2: Reset to center location
  process.on('SIGUSR2', () => {
    gpsState = {
      latitude: CENTER_LAT,
      longitude: CENTER_LON,
      altitude: 15,
      accuracy: 10,
      speed: 0,
      heading: 0,
      satellites: 8,
      enabled: true,
      lastLat: CENTER_LAT,
      lastLon: CENTER_LON,
      lastUpdateTime: Date.now(),
    };
    console.log('Signal received: GPS reset to center location');
  });
  
  // Graceful shutdown
  const shutdown = async () => {
    console.log('\nShutting down mock GPS service...');
    
    // Write final state
    try {
      const data = getLocationData();
      await writeLocationData(data);
      console.log('Final location saved');
    } catch (error) {
      console.error('Error saving final state:', error);
    }
    
    process.exit(0);
  };
  
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

/**
 * Initialize and start the service
 */
async function main() {
  console.log('========================================');
  console.log('Mock GPS Service Starting');
  console.log('========================================');
  console.log(`Update interval: ${UPDATE_INTERVAL}ms`);
  console.log(`Center location: ${CENTER_LAT}, ${CENTER_LON}`);
  console.log(`Walk radius: ${WALK_RADIUS}m`);
  console.log(`Data file: ${LOCATION_DATA_FILE}`);
  console.log('');
  console.log('Control signals:');
  console.log('  kill -USR1 <pid>  Toggle GPS on/off');
  console.log('  kill -USR2 <pid>  Reset to center');
  console.log('========================================\n');
  
  setupSignalHandlers();
  
  // Write initial state immediately
  await updateLoop();
  
  // Start periodic updates
  setInterval(updateLoop, UPDATE_INTERVAL);
}

// Start the service
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

