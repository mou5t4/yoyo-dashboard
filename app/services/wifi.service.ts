import { serviceClient } from './base.service';
import { logger } from '~/lib/logger';

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

export async function scanWiFiNetworks(): Promise<WiFiNetwork[]> {
  try {
    const networks = await serviceClient.get<WiFiNetwork[]>('/wifi/scan');
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
    const result = await serviceClient.post<WiFiConnectResult>('/wifi/connect', {
      ssid,
      password,
    });
    return result;
  } catch (error) {
    logger.error('Failed to connect to WiFi', error);
    return { success: false, error: 'Connection failed' };
  }
}

export async function getCurrentWiFi(): Promise<{ ssid: string; signal: number } | null> {
  try {
    const current = await serviceClient.get<{ ssid: string; signal: number }>('/wifi/current');
    return current;
  } catch (error) {
    logger.error('Failed to get current WiFi', error);
    return null;
  }
}

