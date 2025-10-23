/**
 * Battery data structure that mirrors what an I2C fuel gauge would provide.
 * This interface is used by both mock and real battery services.
 */
export interface BatteryData {
  /** Battery capacity as a percentage (0-100) */
  capacity: number;
  
  /** Battery voltage in volts (e.g., 4.2V for full LiPo) */
  voltage: number;
  
  /** Current in milliamps (positive = charging, negative = discharging) */
  current: number;
  
  /** Battery charging status */
  status: 'charging' | 'discharging' | 'full' | 'unknown';
  
  /** Battery temperature in Celsius */
  temperature: number;
  
  /** Unix timestamp when this data was collected */
  timestamp: number;
}

/**
 * Battery file location
 * Development: Uses project directory
 * Production: Can use /run/yoyo/battery.json (tmpfs) with proper permissions
 */
export const BATTERY_DATA_FILE = process.env.BATTERY_DATA_FILE || '/tmp/yoyo/battery.json';

