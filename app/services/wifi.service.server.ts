import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '~/lib/logger.server';

const execAsync = promisify(exec);

export interface WiFiNetwork {
  ssid: string;
  signal: number; // 0-100
  security: 'open' | 'wep' | 'wpa' | 'wpa2';
  frequency: string; // "2.4GHz" | "5GHz"
}

export interface WiFiConnectResult {
  success: boolean;
  ip?: string;
  error?: string;
}

function parseSecurityType(security: string): 'open' | 'wep' | 'wpa' | 'wpa2' {
  if (!security || security === '--') return 'open';
  if (security.includes('WPA2')) return 'wpa2';
  if (security.includes('WPA')) return 'wpa';
  if (security.includes('WEP')) return 'wep';
  return 'open';
}

export async function scanWiFiNetworks(): Promise<WiFiNetwork[]> {
  try {
    // Force a fresh WiFi scan using nmcli with sudo
    // First, trigger a rescan (this may take a few seconds)
    try {
      await execAsync('sudo nmcli device wifi rescan');
      // Wait a moment for the scan to complete
      await new Promise(resolve => setTimeout(resolve, 3000));
      logger.info('WiFi rescan completed');
    } catch (rescanError: any) {
      // Rescan may fail if already scanning or permissions issue, continue anyway
      logger.warn('WiFi rescan warning (may be already scanning or permissions issue)', {
        error: rescanError.message
      });
    }

    // Now get the list of networks
    const { stdout } = await execAsync('nmcli -t -f SSID,SIGNAL,SECURITY,FREQ device wifi list');

    const networks: WiFiNetwork[] = [];
    const lines = stdout.trim().split('\n');
    const seen = new Set<string>();

    for (const line of lines) {
      const parts = line.split(':');
      if (parts.length >= 3) {
        const ssid = parts[0].trim();
        const signal = parseInt(parts[1]) || 0;
        const security = parseSecurityType(parts[2]);
        const freq = parts[3] || '2400'; // MHz
        const frequency = parseInt(freq) > 3000 ? '5GHz' : '2.4GHz';

        // Skip empty SSIDs and duplicates (keep the strongest signal)
        if (ssid && !seen.has(ssid)) {
          seen.add(ssid);
          networks.push({
            ssid,
            signal,
            security,
            frequency,
          });
        }
      }
    }

    // Sort by signal strength
    networks.sort((a, b) => b.signal - a.signal);

    logger.info(`Found ${networks.length} WiFi networks after scan`);
    return networks;
  } catch (error) {
    logger.error('Failed to scan WiFi networks', error);
    return [];
  }
}

export async function connectToWiFi(
  ssid: string,
  password?: string
): Promise<WiFiConnectResult> {
  try {
    // Check if connection already exists
    try {
      await execAsync(`nmcli connection delete "${ssid}" 2>/dev/null || true`);
    } catch {
      // Ignore if connection doesn't exist
    }

    // Connect to the network
    let command: string;
    if (password) {
      command = `nmcli device wifi connect "${ssid}" password "${password}"`;
    } else {
      command = `nmcli device wifi connect "${ssid}"`;
    }

    const { stdout } = await execAsync(command);

    // Get IP address
    const { stdout: ipOutput } = await execAsync('hostname -I | awk \'{print $1}\'');
    const ip = ipOutput.trim();

    logger.info(`Connected to WiFi: ${ssid}`, { ip });
    return {
      success: true,
      ip,
    };
  } catch (error: any) {
    logger.error('Failed to connect to WiFi', { error: error.message, ssid });
    return {
      success: false,
      error: error.message || 'Connection failed',
    };
  }
}

export async function getCurrentWiFi(): Promise<{ ssid: string; signal: number } | null> {
  try {
    // Get current connection
    const { stdout } = await execAsync('nmcli -t -f NAME,DEVICE connection show --active | grep -E "wlan|wifi"');

    if (!stdout.trim()) {
      return null;
    }

    const parts = stdout.trim().split(':');
    const ssid = parts[0];

    // Get signal strength for current network
    const { stdout: signalOutput } = await execAsync(`nmcli -t -f SSID,SIGNAL device wifi list | grep "^${ssid}:"`);
    const signalParts = signalOutput.trim().split(':');
    const signal = parseInt(signalParts[1]) || 0;

    return { ssid, signal };
  } catch (error) {
    logger.error('Failed to get current WiFi', error);
    return null;
  }
}

