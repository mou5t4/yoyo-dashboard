#!/usr/bin/env tsx
/**
 * Mock Battery Service
 * 
 * Simulates a real battery with I2C fuel gauge by writing data to /run/yoyo/battery.json.
 * This service can be replaced with a real I2C service without changing dashboard code.
 * 
 * Features:
 * - Realistic discharge/charge simulation
 * - Atomic file writes (no corruption)
 * - Graceful shutdown
 * - Signal-based control (USR1 = toggle charging, USR2 = reset)
 */

import fs from 'fs/promises';
import path from 'path';
import type { BatteryData } from '../app/types/battery.types.js';
import { BATTERY_DATA_FILE } from '../app/types/battery.types.js';

// Configuration from environment variables
const UPDATE_INTERVAL = parseInt(process.env.BATTERY_UPDATE_INTERVAL || '30000'); // 30 seconds
const DISCHARGE_RATE = parseFloat(process.env.DISCHARGE_RATE || '0.5'); // % per minute
const CHARGE_RATE = parseFloat(process.env.CHARGE_RATE || '1.0'); // % per minute

// Battery state
let batteryState = {
  capacity: 85,
  isCharging: false,
  voltage: 3.9, // Start voltage for 85%
  temperature: 25,
};

/**
 * Calculate realistic LiPo voltage based on capacity
 * LiPo voltage range: 3.0V (0%) to 4.2V (100%)
 */
function calculateVoltage(capacity: number): number {
  // Simple linear approximation
  // Real fuel gauges use lookup tables, but this is close enough
  const minVoltage = 3.0;
  const maxVoltage = 4.2;
  return minVoltage + (capacity / 100) * (maxVoltage - minVoltage);
}

/**
 * Calculate current based on charging state
 * Positive = charging, Negative = discharging
 */
function calculateCurrent(isCharging: boolean, capacity: number): number {
  if (isCharging) {
    // Charging current decreases as battery fills up (realistic behavior)
    if (capacity >= 95) return 100; // Trickle charge
    if (capacity >= 80) return 300;
    return 500; // Normal charge current
  } else {
    // Discharging current (simulated load)
    return -200; // 200mA discharge
  }
}

/**
 * Simulate temperature based on charging/discharging
 */
function simulateTemperature(isCharging: boolean, currentTemp: number): number {
  const ambient = 25;
  const chargingHeat = 35;
  const dischargingHeat = 30;
  
  const targetTemp = isCharging ? chargingHeat : (currentTemp > ambient ? dischargingHeat : ambient);
  
  // Gradual temperature change
  if (currentTemp < targetTemp) {
    return Math.min(currentTemp + 0.5, targetTemp);
  } else if (currentTemp > targetTemp) {
    return Math.max(currentTemp - 0.5, targetTemp);
  }
  return currentTemp;
}

/**
 * Update battery state based on elapsed time
 */
function updateBatteryState() {
  const minutesElapsed = UPDATE_INTERVAL / 60000;
  
  if (batteryState.isCharging) {
    // Charging
    batteryState.capacity = Math.min(100, batteryState.capacity + (CHARGE_RATE * minutesElapsed));
    
    // Auto-stop charging at 100%
    if (batteryState.capacity >= 100) {
      batteryState.capacity = 100;
      // In real scenario, charging might continue at trickle rate
    }
  } else {
    // Discharging
    batteryState.capacity = Math.max(0, batteryState.capacity - (DISCHARGE_RATE * minutesElapsed));
    
    // Auto-start charging when critically low (simulate plugging in)
    if (batteryState.capacity <= 15) {
      console.log('Battery critically low, auto-switching to charging mode');
      batteryState.isCharging = true;
    }
  }
  
  // Update derived values
  batteryState.voltage = calculateVoltage(batteryState.capacity);
  batteryState.temperature = simulateTemperature(batteryState.isCharging, batteryState.temperature);
}

/**
 * Get current battery data
 */
function getBatteryData(): BatteryData {
  let status: BatteryData['status'];
  
  if (batteryState.capacity >= 100 && batteryState.isCharging) {
    status = 'full';
  } else if (batteryState.isCharging) {
    status = 'charging';
  } else {
    status = 'discharging';
  }
  
  return {
    capacity: Math.round(batteryState.capacity * 10) / 10, // Round to 1 decimal
    voltage: Math.round(batteryState.voltage * 100) / 100, // Round to 2 decimals
    current: calculateCurrent(batteryState.isCharging, batteryState.capacity),
    status,
    temperature: Math.round(batteryState.temperature * 10) / 10,
    timestamp: Date.now(),
  };
}

/**
 * Write battery data to file atomically
 */
async function writeBatteryData(data: BatteryData): Promise<void> {
  const dir = path.dirname(BATTERY_DATA_FILE);
  
  // Ensure directory exists
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore
  }
  
  // Write atomically: write to temp file, then rename
  const tempFile = `${BATTERY_DATA_FILE}.tmp`;
  const jsonData = JSON.stringify(data, null, 2);
  
  await fs.writeFile(tempFile, jsonData, 'utf-8');
  await fs.rename(tempFile, BATTERY_DATA_FILE);
}

/**
 * Main update loop
 */
async function updateLoop() {
  try {
    updateBatteryState();
    const data = getBatteryData();
    await writeBatteryData(data);
    
    console.log(
      `[${new Date().toISOString()}] Battery: ${data.capacity.toFixed(1)}% | ` +
      `${data.voltage.toFixed(2)}V | ${data.current}mA | ${data.status} | ${data.temperature.toFixed(1)}°C`
    );
  } catch (error) {
    console.error('Error updating battery data:', error);
  }
}

/**
 * Signal handlers for manual control
 */
function setupSignalHandlers() {
  // SIGUSR1: Toggle charging state
  process.on('SIGUSR1', () => {
    batteryState.isCharging = !batteryState.isCharging;
    console.log(`Signal received: Charging ${batteryState.isCharging ? 'enabled' : 'disabled'}`);
  });
  
  // SIGUSR2: Reset to default state
  process.on('SIGUSR2', () => {
    batteryState = {
      capacity: 85,
      isCharging: false,
      voltage: 3.9,
      temperature: 25,
    };
    console.log('Signal received: Battery state reset to defaults');
  });
  
  // Graceful shutdown
  const shutdown = async () => {
    console.log('\nShutting down mock battery service...');
    
    // Write final state
    try {
      const data = getBatteryData();
      await writeBatteryData(data);
      console.log('Final battery state saved');
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
  console.log('Mock Battery Service Starting');
  console.log('========================================');
  console.log(`Update interval: ${UPDATE_INTERVAL}ms`);
  console.log(`Discharge rate: ${DISCHARGE_RATE}% per minute`);
  console.log(`Charge rate: ${CHARGE_RATE}% per minute`);
  console.log(`Data file: ${BATTERY_DATA_FILE}`);
  console.log('');
  console.log('Control signals:');
  console.log('  kill -USR1 <pid>  Toggle charging');
  console.log('  kill -USR2 <pid>  Reset to defaults');
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

