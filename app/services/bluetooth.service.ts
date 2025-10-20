import { serviceClient } from './base.service';
import { logger } from '~/lib/logger.server';

export interface BluetoothDevice {
  address: string;
  name: string;
  paired: boolean;
  connected: boolean;
  type: 'headphones' | 'speaker' | 'unknown';
}

export async function scanBluetoothDevices(): Promise<BluetoothDevice[]> {
  try {
    const devices = await serviceClient.get<BluetoothDevice[]>('/bluetooth/scan');
    return devices;
  } catch (error) {
    logger.warn('Bluetooth API unavailable, using mock data', { endpoint: '/bluetooth/scan' });
    // Return mock available devices when API is unavailable
    return [
      {
        address: 'AA:BB:CC:DD:EE:01',
        name: 'JBL Flip 5',
        paired: false,
        connected: false,
        type: 'speaker',
      },
      {
        address: 'AA:BB:CC:DD:EE:02',
        name: 'Sony WH-1000XM4',
        paired: false,
        connected: false,
        type: 'headphones',
      },
    ];
  }
}

export async function getPairedDevices(): Promise<BluetoothDevice[]> {
  try {
    const devices = await serviceClient.get<BluetoothDevice[]>('/bluetooth/devices');
    return devices;
  } catch (error) {
    logger.warn('Bluetooth API unavailable, using mock data', { endpoint: '/bluetooth/devices' });
    // Return mock paired devices when API is unavailable
    return [
      {
        address: 'AA:BB:CC:DD:EE:FF',
        name: 'Kids Headphones',
        paired: true,
        connected: true,
        type: 'headphones',
      },
    ];
  }
}

export async function pairBluetoothDevice(address: string): Promise<{ success: boolean }> {
  try {
    const result = await serviceClient.post<{ success: boolean }>('/bluetooth/pair', { address });
    return result;
  } catch (error) {
    logger.error('Failed to pair Bluetooth device', error);
    return { success: false };
  }
}

export async function connectBluetoothDevice(address: string): Promise<{ success: boolean }> {
  try {
    const result = await serviceClient.post<{ success: boolean }>('/bluetooth/connect', { address });
    return result;
  } catch (error) {
    logger.error('Failed to connect Bluetooth device', error);
    return { success: false };
  }
}

export async function forgetBluetoothDevice(address: string): Promise<{ success: boolean }> {
  try {
    const result = await serviceClient.delete<{ success: boolean }>(`/bluetooth/device/${address}`);
    return result;
  } catch (error) {
    logger.error('Failed to forget Bluetooth device', error);
    return { success: false };
  }
}

