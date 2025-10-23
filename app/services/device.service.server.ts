import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '~/lib/logger.server';
import fs from 'fs/promises';
import type { BatteryData } from '~/types/battery.types';
import { BATTERY_DATA_FILE } from '~/types/battery.types';

const execAsync = promisify(exec);

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
    const [battery, charging, wifi, storage, uptime, temperature] = await Promise.all([
      getBatteryLevel(),
      isCharging(),
      getWiFiSignal(),
      getStorageInfo(),
      getUptime(),
      getTemperature(),
    ]);

    return {
      battery,
      charging,
      signal: { wifi },
      storage,
      uptime,
      temperature,
    };
  } catch (error) {
    logger.error('Failed to fetch device status', error);
    // Return realistic mock/fallback data when commands fail
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

/**
 * Read battery data from the mock/real battery service file
 */
async function readBatteryDataFile(): Promise<BatteryData | null> {
  try {
    const data = await fs.readFile(BATTERY_DATA_FILE, 'utf-8');
    const batteryData = JSON.parse(data) as BatteryData;
    
    // Validate the data structure
    if (
      typeof batteryData.capacity === 'number' &&
      typeof batteryData.status === 'string' &&
      typeof batteryData.timestamp === 'number'
    ) {
      // Check if data is stale (older than 2 minutes)
      const ageMs = Date.now() - batteryData.timestamp;
      if (ageMs > 120000) {
        logger.warn(`Battery data is stale (${Math.round(ageMs / 1000)}s old)`);
        return null;
      }
      
      return batteryData;
    }
    
    logger.warn('Invalid battery data structure');
    return null;
  } catch (error) {
    // File doesn't exist or can't be read - this is normal if service isn't running
    return null;
  }
}

async function getBatteryLevel(): Promise<number> {
  try {
    // Method 1: Try mock/real battery service first
    const batteryData = await readBatteryDataFile();
    if (batteryData) {
      return Math.round(batteryData.capacity);
    }

    // Method 2: /sys/class/power_supply (most common on Linux)
    try {
      const capacity = await fs.readFile('/sys/class/power_supply/BAT0/capacity', 'utf-8');
      return parseInt(capacity.trim());
    } catch {}

    // Method 3: Alternative battery path
    try {
      const capacity = await fs.readFile('/sys/class/power_supply/BAT1/capacity', 'utf-8');
      return parseInt(capacity.trim());
    } catch {}

    // Method 4: upower (if available)
    try {
      const { stdout } = await execAsync('upower -i /org/freedesktop/UPower/devices/battery_BAT0 | grep percentage');
      const match = stdout.match(/(\d+)%/);
      if (match) return parseInt(match[1]);
    } catch {}

    // Fallback
    return 85;
  } catch (error) {
    logger.warn('Could not determine battery level', error);
    return 85;
  }
}

async function isCharging(): Promise<boolean> {
  try {
    // Method 1: Try mock/real battery service first
    const batteryData = await readBatteryDataFile();
    if (batteryData) {
      return batteryData.status === 'charging' || batteryData.status === 'full';
    }

    // Method 2: /sys/class/power_supply
    try {
      const status = await fs.readFile('/sys/class/power_supply/BAT0/status', 'utf-8');
      return status.trim() === 'Charging';
    } catch {}

    // Method 3: upower
    try {
      const { stdout } = await execAsync('upower -i /org/freedesktop/UPower/devices/battery_BAT0 | grep state');
      return stdout.includes('charging');
    } catch {}

    return false;
  } catch (error) {
    logger.warn('Could not determine charging status', error);
    return false;
  }
}

async function getWiFiSignal(): Promise<number> {
  try {
    // Get WiFi signal strength using nmcli or iwconfig
    try {
      const { stdout } = await execAsync('nmcli -t -f ACTIVE,SIGNAL dev wifi | grep \'^yes\'');
      const parts = stdout.trim().split(':');
      if (parts.length >= 2) {
        return parseInt(parts[1]) || 0;
      }
    } catch {}

    // Alternative: iwconfig
    try {
      const { stdout } = await execAsync('iwconfig 2>/dev/null | grep "Link Quality"');
      const match = stdout.match(/Link Quality=(\d+)\/(\d+)/);
      if (match) {
        const quality = parseInt(match[1]);
        const max = parseInt(match[2]);
        return Math.round((quality / max) * 100);
      }
    } catch {}

    return 75;
  } catch (error) {
    logger.warn('Could not determine WiFi signal', error);
    return 75;
  }
}

async function getStorageInfo(): Promise<{ used: number; total: number }> {
  try {
    const { stdout } = await execAsync('df -B1 / | tail -1');
    const parts = stdout.trim().split(/\s+/);

    if (parts.length >= 3) {
      const total = parseInt(parts[1]) || 0;
      const used = parseInt(parts[2]) || 0;
      return { used, total };
    }

    throw new Error('Could not parse df output');
  } catch (error) {
    logger.warn('Could not determine storage info', error);
    return {
      used: 2.5 * 1024 * 1024 * 1024,
      total: 8 * 1024 * 1024 * 1024,
    };
  }
}

async function getUptime(): Promise<number> {
  try {
    const uptime = await fs.readFile('/proc/uptime', 'utf-8');
    const seconds = parseFloat(uptime.split(' ')[0]);
    return Math.round(seconds);
  } catch (error) {
    logger.warn('Could not determine uptime', error);
    return 3600 * 24 * 3; // 3 days
  }
}

async function getTemperature(): Promise<number> {
  try {
    // Try Raspberry Pi thermal zone
    try {
      const temp = await fs.readFile('/sys/class/thermal/thermal_zone0/temp', 'utf-8');
      return Math.round(parseInt(temp.trim()) / 1000); // Convert millidegrees to degrees
    } catch {}

    // Try other thermal zones
    try {
      const { stdout } = await execAsync('cat /sys/class/thermal/thermal_zone*/temp 2>/dev/null | head -1');
      return Math.round(parseInt(stdout.trim()) / 1000);
    } catch {}

    // Try sensors command if available
    try {
      const { stdout } = await execAsync('sensors 2>/dev/null | grep "Core 0" | awk \'{print $3}\' | sed \'s/+//\' | sed \'s/°C//\'');
      const temp = parseFloat(stdout.trim());
      if (!isNaN(temp)) return Math.round(temp);
    } catch {}

    return 45;
  } catch (error) {
    logger.warn('Could not determine temperature', error);
    return 45;
  }
}
