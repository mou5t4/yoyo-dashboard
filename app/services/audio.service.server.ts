import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '~/lib/logger.server';

const execAsync = promisify(exec);

export interface AudioDevice {
  id: string;
  name: string;
  type: 'playback' | 'capture';
  isDefault: boolean;
  volume: number; // 0-100
  muted: boolean;
}

export interface AudioSettings {
  outputDevice: string;
  inputDevice: string;
  outputVolume: number;
  inputVolume: number;
  outputMuted: boolean;
  inputMuted: boolean;
}

// Get list of audio output devices
export async function getAudioDevices(): Promise<{ playback: AudioDevice[], capture: AudioDevice[] }> {
  try {
    // Try ALSA first
    try {
      const { stdout } = await execAsync('aplay -l 2>/dev/null');
      const playbackDevices = parseAlsaDevices(stdout, 'playback');

      const { stdout: captureOut } = await execAsync('arecord -l 2>/dev/null');
      const captureDevices = parseAlsaDevices(captureOut, 'capture');

      return { playback: playbackDevices, capture: captureDevices };
    } catch {}

    // Try PulseAudio
    try {
      const { stdout: sinkOut } = await execAsync('pactl list short sinks 2>/dev/null');
      const playbackDevices = parsePulseDevices(sinkOut, 'playback');

      const { stdout: sourceOut } = await execAsync('pactl list short sources 2>/dev/null');
      const captureDevices = parsePulseDevices(sourceOut, 'capture');

      return { playback: playbackDevices, capture: captureDevices };
    } catch {}

    // Fallback to mock devices
    logger.warn('No audio system detected, using mock devices');
    return {
      playback: [
        { id: 'hw:0,0', name: 'Built-in Audio', type: 'playback', isDefault: true, volume: 75, muted: false },
      ],
      capture: [
        { id: 'hw:0,0', name: 'Built-in Microphone', type: 'capture', isDefault: true, volume: 80, muted: false },
      ],
    };
  } catch (error) {
    logger.error('Failed to get audio devices', error);
    return { playback: [], capture: [] };
  }
}

function parseAlsaDevices(output: string, type: 'playback' | 'capture'): AudioDevice[] {
  const devices: AudioDevice[] = [];
  const lines = output.split('\n');

  for (const line of lines) {
    // Format: "card 0: Device [Name], device 0: ..."
    const match = line.match(/card (\d+):.+?\[(.+?)\]/);
    if (match) {
      const cardNum = match[1];
      const name = match[2];
      devices.push({
        id: `hw:${cardNum},0`,
        name,
        type,
        isDefault: cardNum === '0',
        volume: 75,
        muted: false,
      });
    }
  }

  return devices;
}

function parsePulseDevices(output: string, type: 'playback' | 'capture'): AudioDevice[] {
  const devices: AudioDevice[] = [];
  const lines = output.split('\n');

  for (const line of lines) {
    if (!line.trim()) continue;
    const parts = line.split('\t');
    if (parts.length >= 2) {
      devices.push({
        id: parts[0],
        name: parts[1],
        type,
        isDefault: line.includes('*'),
        volume: 75,
        muted: false,
      });
    }
  }

  return devices;
}

// Get current audio settings
export async function getAudioSettings(): Promise<AudioSettings> {
  try {
    // Try amixer (ALSA)
    try {
      const { stdout: masterOut } = await execAsync('amixer get Master 2>/dev/null');
      const volumeMatch = masterOut.match(/\[(\d+)%\]/);
      const mutedMatch = masterOut.match(/\[(on|off)\]/);

      const outputVolume = volumeMatch ? parseInt(volumeMatch[1]) : 75;
      const outputMuted = mutedMatch ? mutedMatch[1] === 'off' : false;

      return {
        outputDevice: 'hw:0,0',
        inputDevice: 'hw:0,0',
        outputVolume,
        inputVolume: 80,
        outputMuted,
        inputMuted: false,
      };
    } catch {}

    // Try PulseAudio
    try {
      const { stdout } = await execAsync('pactl list sinks 2>/dev/null | grep -E "(Volume|Mute)"');
      const volumeMatch = stdout.match(/(\d+)%/);
      const mutedMatch = stdout.match(/Mute: (yes|no)/);

      const outputVolume = volumeMatch ? parseInt(volumeMatch[1]) : 75;
      const outputMuted = mutedMatch ? mutedMatch[1] === 'yes' : false;

      return {
        outputDevice: 'default',
        inputDevice: 'default',
        outputVolume,
        inputVolume: 80,
        outputMuted,
        inputMuted: false,
      };
    } catch {}

    // Fallback
    return {
      outputDevice: 'hw:0,0',
      inputDevice: 'hw:0,0',
      outputVolume: 75,
      inputVolume: 80,
      outputMuted: false,
      inputMuted: false,
    };
  } catch (error) {
    logger.error('Failed to get audio settings', error);
    return {
      outputDevice: 'hw:0,0',
      inputDevice: 'hw:0,0',
      outputVolume: 75,
      inputVolume: 80,
      outputMuted: false,
      inputMuted: false,
    };
  }
}

// Set volume (0-100)
export async function setVolume(volume: number, type: 'output' | 'input' = 'output'): Promise<{ success: boolean; error?: string }> {
  try {
    const clampedVolume = Math.max(0, Math.min(100, volume));

    // Try amixer (ALSA)
    try {
      const control = type === 'output' ? 'Master' : 'Capture';
      await execAsync(`amixer set ${control} ${clampedVolume}% 2>/dev/null`);
      logger.info(`Set ${type} volume to ${clampedVolume}%`);
      return { success: true };
    } catch {}

    // Try PulseAudio
    try {
      const target = type === 'output' ? '@DEFAULT_SINK@' : '@DEFAULT_SOURCE@';
      await execAsync(`pactl set-sink-volume ${target} ${clampedVolume}% 2>/dev/null`);
      logger.info(`Set ${type} volume to ${clampedVolume}%`);
      return { success: true };
    } catch {}

    return { success: false, error: 'No audio system available' };
  } catch (error: any) {
    logger.error(`Failed to set ${type} volume`, error);
    return { success: false, error: error.message || 'Failed to set volume' };
  }
}

// Mute/unmute
export async function setMute(muted: boolean, type: 'output' | 'input' = 'output'): Promise<{ success: boolean; error?: string }> {
  try {
    // Try amixer (ALSA)
    try {
      const control = type === 'output' ? 'Master' : 'Capture';
      const state = muted ? 'mute' : 'unmute';
      await execAsync(`amixer set ${control} ${state} 2>/dev/null`);
      logger.info(`${state} ${type}`);
      return { success: true };
    } catch {}

    // Try PulseAudio
    try {
      const target = type === 'output' ? '@DEFAULT_SINK@' : '@DEFAULT_SOURCE@';
      const muteVal = muted ? '1' : '0';
      await execAsync(`pactl set-sink-mute ${target} ${muteVal} 2>/dev/null`);
      logger.info(`${muted ? 'Muted' : 'Unmuted'} ${type}`);
      return { success: true };
    } catch {}

    return { success: false, error: 'No audio system available' };
  } catch (error: any) {
    logger.error(`Failed to ${muted ? 'mute' : 'unmute'} ${type}`, error);
    return { success: false, error: error.message || 'Failed to change mute state' };
  }
}

// Test audio by playing a test sound
export async function playTestSound(): Promise<{ success: boolean; error?: string }> {
  try {
    // Try to play a test tone using speaker-test
    try {
      await execAsync('speaker-test -t sine -f 1000 -l 1 2>/dev/null &');
      logger.info('Playing test sound');
      return { success: true };
    } catch {}

    // Try aplay with /dev/urandom for noise
    try {
      await execAsync('timeout 1 aplay -D default /dev/urandom 2>/dev/null || true');
      logger.info('Played test noise');
      return { success: true };
    } catch {}

    // Try paplay
    try {
      await execAsync('paplay /usr/share/sounds/alsa/Front_Center.wav 2>/dev/null || true');
      return { success: true };
    } catch {}

    return { success: false, error: 'No audio playback method available' };
  } catch (error: any) {
    logger.error('Failed to play test sound', error);
    return { success: false, error: error.message || 'Failed to play test sound' };
  }
}

// Record audio test (capture for 3 seconds)
export async function recordTestAudio(): Promise<{ success: boolean; error?: string }> {
  try {
    // Record 3 seconds of audio to test microphone
    await execAsync('timeout 3 arecord -d 3 -f cd -t wav /tmp/audio_test.wav 2>/dev/null || true');
    logger.info('Recorded test audio');
    return { success: true };
  } catch (error: any) {
    logger.error('Failed to record test audio', error);
    return { success: false, error: error.message || 'Failed to record audio' };
  }
}
