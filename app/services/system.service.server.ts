import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '~/lib/logger.server';

const execAsync = promisify(exec);

export interface SystemTimeInfo {
  currentTime: string; // ISO format
  timezone: string;
  ntpEnabled: boolean;
  ntpSynchronized: boolean;
}

/**
 * Get current system time information including timezone and NTP status
 */
export async function getSystemTimeInfo(): Promise<SystemTimeInfo> {
  try {
    const { stdout } = await execAsync('timedatectl show --no-pager');
    
    const lines = stdout.split('\n');
    const data: Record<string, string> = {};
    
    lines.forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        data[key] = valueParts.join('=');
      }
    });
    
    // Get current time
    const currentTime = new Date().toISOString();
    
    // Parse timezone
    const timezone = data.Timezone || 'UTC';
    
    // Parse NTP status
    const ntpEnabled = data.NTP === 'yes';
    const ntpSynchronized = data.NTPSynchronized === 'yes';
    
    logger.info('Retrieved system time info', { timezone, ntpEnabled, ntpSynchronized });
    
    return {
      currentTime,
      timezone,
      ntpEnabled,
      ntpSynchronized,
    };
  } catch (error: any) {
    logger.error('Failed to get system time info', { error: error.message });
    
    // Fallback to basic info
    return {
      currentTime: new Date().toISOString(),
      timezone: 'UTC',
      ntpEnabled: false,
      ntpSynchronized: false,
    };
  }
}

/**
 * Get list of available timezones from the system
 */
export async function getAvailableTimezones(): Promise<string[]> {
  try {
    const { stdout } = await execAsync('timedatectl list-timezones --no-pager');
    const timezones = stdout.split('\n').filter(tz => tz.trim().length > 0);
    
    logger.info(`Retrieved ${timezones.length} available timezones`);
    return timezones;
  } catch (error: any) {
    logger.error('Failed to get available timezones', { error: error.message });
    
    // Return common timezones as fallback
    return [
      'UTC',
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'Europe/London',
      'Europe/Paris',
      'Europe/Berlin',
      'Asia/Tokyo',
      'Asia/Shanghai',
      'Australia/Sydney',
    ];
  }
}

/**
 * Set system date and time
 * Requires appropriate permissions (sudo/root)
 */
export async function setSystemDateTime(datetime: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Convert ISO datetime to format expected by timedatectl: "YYYY-MM-DD HH:MM:SS"
    const date = new Date(datetime);
    const formattedDateTime = date.toISOString().slice(0, 19).replace('T', ' ');
    
    // Disable NTP temporarily to allow manual time setting
    try {
      await execAsync('sudo timedatectl set-ntp false');
    } catch (ntpError) {
      logger.warn('Could not disable NTP', { error: ntpError });
    }
    
    // Set the time
    const command = `sudo timedatectl set-time "${formattedDateTime}"`;
    await execAsync(command);
    
    logger.info('System time set successfully', { datetime: formattedDateTime });
    return { success: true };
  } catch (error: any) {
    logger.error('Failed to set system time', { error: error.message, datetime });
    return { 
      success: false, 
      error: error.message || 'Failed to set system time. Requires elevated permissions.' 
    };
  }
}

/**
 * Set system timezone
 * Requires appropriate permissions (sudo/root)
 */
export async function setSystemTimezone(timezone: string): Promise<{ success: boolean; error?: string }> {
  try {
    const command = `sudo timedatectl set-timezone "${timezone}"`;
    await execAsync(command);
    
    logger.info('System timezone set successfully', { timezone });
    return { success: true };
  } catch (error: any) {
    logger.error('Failed to set system timezone', { error: error.message, timezone });
    return { 
      success: false, 
      error: error.message || 'Failed to set timezone. Requires elevated permissions.' 
    };
  }
}

/**
 * Enable or disable NTP (Network Time Protocol) synchronization
 */
export async function setNTP(enabled: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    const command = `sudo timedatectl set-ntp ${enabled ? 'true' : 'false'}`;
    await execAsync(command);
    
    logger.info(`NTP ${enabled ? 'enabled' : 'disabled'} successfully`);
    return { success: true };
  } catch (error: any) {
    logger.error('Failed to set NTP status', { error: error.message, enabled });
    return { 
      success: false, 
      error: error.message || 'Failed to set NTP status. Requires elevated permissions.' 
    };
  }
}




