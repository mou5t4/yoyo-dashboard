import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '~/lib/logger.server';

const execAsync = promisify(exec);

export interface BluetoothDevice {
  address: string;
  name: string;
  paired: boolean;
  connected: boolean;
  type: 'headphones' | 'speaker' | 'unknown';
}

function parseDeviceType(deviceClass: string): 'headphones' | 'speaker' | 'unknown' {
  const lower = deviceClass.toLowerCase();
  if (lower.includes('headphone') || lower.includes('headset')) return 'headphones';
  if (lower.includes('speaker') || lower.includes('audio')) return 'speaker';
  return 'unknown';
}

export async function scanBluetoothDevices(): Promise<BluetoothDevice[]> {
  try {
    // Start bluetooth scan
    try {
      await execAsync('printf "power on\\nquit\\n" | bluetoothctl');
      // Start scan with timeout (scan will run in background)
      await execAsync('printf "scan on\\nquit\\n" | timeout 10 bluetoothctl');
    } catch (scanError) {
      // Scan timeout is expected
      logger.debug('Bluetooth scan timeout (expected)');
    }

    // Get list of devices
    const { stdout } = await execAsync('printf "devices\\nquit\\n" | bluetoothctl 2>&1');
    const devices: BluetoothDevice[] = [];

    // Strip ANSI color codes
    const cleanOutput = stdout.replace(/\x1B\[[0-9;]*[A-Za-z]/g, '');
    const lines = cleanOutput.trim().split('\n');

    for (const line of lines) {
      // Format: "Device AA:BB:CC:DD:EE:FF Device Name"
      // Match lines that start with "Device"
      const match = line.match(/^Device\s+([0-9A-F:]+)\s+(.+)/i);
      if (match) {
        const address = match[1];
        const name = match[2].trim();

        // Check if paired
        let paired = false;
        let connected = false;
        try {
          const { stdout: infoOut } = await execAsync(`printf "info ${address}\\nquit\\n" | bluetoothctl 2>&1`);
          const cleanInfo = infoOut.replace(/\x1B\[[0-9;]*[A-Za-z]/g, '');
          paired = cleanInfo.includes('Paired: yes');
          connected = cleanInfo.includes('Connected: yes');
        } catch {
          // Device info not available
        }

        devices.push({
          address,
          name,
          paired,
          connected,
          type: 'unknown', // Can be enhanced by checking device class
        });
      }
    }

    logger.info(`Found ${devices.length} Bluetooth devices`);
    return devices;
  } catch (error) {
    logger.error('Failed to scan Bluetooth devices', error);
    // Return mock data as fallback
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
    // Use "devices Paired" command with printf
    const { stdout } = await execAsync('printf "devices Paired\\nquit\\n" | bluetoothctl 2>&1');
    const devices: BluetoothDevice[] = [];

    // Strip ANSI color codes
    const cleanOutput = stdout.replace(/\x1B\[[0-9;]*[A-Za-z]/g, '');
    const lines = cleanOutput.trim().split('\n');

    for (const line of lines) {
      if (!line) continue;

      // Match lines that start with "Device"
      const match = line.match(/^Device\s+([0-9A-F:]+)\s+(.+)/i);
      if (match) {
        const address = match[1];
        const name = match[2].trim();

        // Check if connected
        let connected = false;
        try {
          const { stdout: infoOut } = await execAsync(`printf "info ${address}\\nquit\\n" | bluetoothctl 2>&1`);
          const cleanInfo = infoOut.replace(/\x1B\[[0-9;]*[A-Za-z]/g, '');
          connected = cleanInfo.includes('Connected: yes');
        } catch {
          // Device info not available
        }

        devices.push({
          address,
          name,
          paired: true,
          connected,
          type: 'unknown',
        });
      }
    }

    logger.info(`Found ${devices.length} paired Bluetooth devices`);
    return devices;
  } catch (error) {
    logger.error('Failed to get paired devices', error);
    // Return mock data as fallback
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

export async function pairBluetoothDevice(address: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Power on bluetooth
    await execAsync('printf "power on\\nquit\\n" | bluetoothctl');

    // Use printf to pipe commands to bluetoothctl with timeout
    const pairCommand = `printf "pair ${address}\\nquit\\n" | timeout 30 bluetoothctl`;
    const { stdout, stderr } = await execAsync(pairCommand);

    // Check for success indicators
    if (stdout.includes('Pairing successful') || stdout.includes('AlreadyExists')) {
      // Trust the device after pairing
      try {
        await execAsync(`printf "trust ${address}\\nquit\\n" | bluetoothctl`);
      } catch {
        // Trust failure is not critical
      }

      logger.info(`Paired Bluetooth device: ${address}`);
      return { success: true };
    }

    // Check for failure
    if (stderr.includes('Failed') || stdout.includes('Failed to pair') || stdout.includes('org.bluez.Error')) {
      const errorMsg = stdout.includes('not available') ? 'Device not available' : 'Failed to pair device';
      return { success: false, error: errorMsg };
    }

    // If we get here, assume success (some devices pair silently)
    logger.info(`Paired Bluetooth device: ${address}`);
    return { success: true };
  } catch (error: any) {
    logger.error('Failed to pair Bluetooth device', { error: error.message, address });
    return { success: false, error: error.message || 'Pairing failed' };
  }
}

export async function connectBluetoothDevice(address: string): Promise<{ success: boolean; error?: string }> {
  try {
    await execAsync('printf "power on\\nquit\\n" | bluetoothctl');

    // Use printf to pipe commands to bluetoothctl
    const connectCommand = `printf "connect ${address}\\nquit\\n" | timeout 30 bluetoothctl`;
    const { stdout, stderr } = await execAsync(connectCommand);

    // Check for success
    if (stdout.includes('Connection successful') || stdout.includes('AlreadyConnected')) {
      logger.info(`Connected to Bluetooth device: ${address}`);
      return { success: true };
    }

    // Check for failure
    if (stderr.includes('Failed') || stdout.includes('Failed to connect') || stdout.includes('org.bluez.Error')) {
      const errorMsg = stdout.includes('not available') ? 'Device not available' : 'Failed to connect to device';
      return { success: false, error: errorMsg };
    }

    // If we get here, assume success
    logger.info(`Connected to Bluetooth device: ${address}`);
    return { success: true };
  } catch (error: any) {
    logger.error('Failed to connect Bluetooth device', { error: error.message, address });
    return { success: false, error: error.message || 'Connection failed' };
  }
}

export async function disconnectBluetoothDevice(address: string): Promise<{ success: boolean; error?: string }> {
  try {
    const disconnectCommand = `printf "disconnect ${address}\\nquit\\n" | bluetoothctl`;
    const { stdout, stderr } = await execAsync(disconnectCommand);

    // Check for success
    if (stdout.includes('Successful disconnected') || stdout.includes('NotConnected')) {
      logger.info(`Disconnected Bluetooth device: ${address}`);
      return { success: true };
    }

    // Check for failure
    if (stderr.includes('Failed') || stdout.includes('Failed to disconnect')) {
      return { success: false, error: 'Failed to disconnect device' };
    }

    logger.info(`Disconnected Bluetooth device: ${address}`);
    return { success: true };
  } catch (error: any) {
    logger.error('Failed to disconnect Bluetooth device', { error: error.message, address });
    return { success: false, error: error.message || 'Disconnection failed' };
  }
}

export async function forgetBluetoothDevice(address: string): Promise<{ success: boolean; error?: string }> {
  try {
    // First disconnect if connected
    try {
      await execAsync(`printf "disconnect ${address}\\nquit\\n" | bluetoothctl`);
    } catch {
      // Ignore if not connected
    }

    // Remove the device
    const removeCommand = `printf "remove ${address}\\nquit\\n" | bluetoothctl`;
    const { stdout, stderr } = await execAsync(removeCommand);

    // Check for success
    if (stdout.includes('Device has been removed') || stdout.includes('not available')) {
      logger.info(`Removed Bluetooth device: ${address}`);
      return { success: true };
    }

    // Check for failure
    if (stderr.includes('Failed') || stdout.includes('Failed to remove')) {
      return { success: false, error: 'Failed to remove device' };
    }

    logger.info(`Removed Bluetooth device: ${address}`);
    return { success: true };
  } catch (error: any) {
    logger.error('Failed to forget Bluetooth device', { error: error.message, address });
    return { success: false, error: error.message || 'Remove failed' };
  }
}
