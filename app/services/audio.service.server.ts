import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '~/lib/logger.server';

const execAsync = promisify(exec);

// Friendly name mapping for common audio devices
function getFriendlyDeviceName(technicalName: string, type: 'playback' | 'capture'): string {
  const lowerName = technicalName.toLowerCase();

  // Common patterns
  if (lowerName.includes('bcm2835')) {
    return type === 'playback' ? '3.5mm Audio Jack' : 'Built-in Microphone';
  }
  if (lowerName.includes('vc4-hdmi') || lowerName.includes('hdmi')) {
    return 'HDMI Audio';
  }
  if (lowerName.includes('usb') || lowerName.includes('usb audio')) {
    return 'USB Audio Device';
  }
  if (lowerName.includes('bluetooth')) {
    return 'Bluetooth Audio';
  }
  if (lowerName.includes('speaker')) {
    return 'Speaker';
  }
  if (lowerName.includes('headphone')) {
    return 'Headphones';
  }
  if (lowerName.includes('microphone') || lowerName.includes('mic')) {
    return 'Microphone';
  }
  if (lowerName.includes('line in')) {
    return 'Line In';
  }
  if (lowerName.includes('line out')) {
    return 'Line Out';
  }
  if (lowerName.includes('built-in')) {
    return type === 'playback' ? 'Built-in Speaker' : 'Built-in Microphone';
  }
  
  // If nothing matches, clean up the technical name
  let cleaned = technicalName
    .replace(/alsa_output\.|alsa_input\./gi, '')
    .replace(/\.platform.+/gi, '')
    .replace(/mailbox\.stereo-fallback/gi, '')
    .replace(/\.mono/gi, '')
    .replace(/\./g, ' ')
    .replace(/-/g, ' ')
    .trim();
  
  // Capitalize first letter of each word
  cleaned = cleaned
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  return cleaned || technicalName;
}


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
  audioMode: 'browser' | 'device'; // New field for audio output mode
}

// Get list of audio output devices
export async function getAudioDevices(): Promise<{ playback: AudioDevice[], capture: AudioDevice[] }> {
  try {
    let playbackDevices: AudioDevice[] = [];
    let captureDevices: AudioDevice[] = [];

    // Try PulseAudio first for playback (more reliable for device management)
    try {
      // Enable all available audio cards to make them available as sinks
      await enableAllAudioCards();
      
      const { stdout: sinkOut } = await execAsync('pactl list short sinks 2>/dev/null');
      playbackDevices = parsePulseDevices(sinkOut, 'playback');
    } catch {}

    // Use ALSA for capture devices since arecord requires ALSA device names
    try {
      const { stdout: captureOut } = await execAsync('arecord -l 2>/dev/null');
      captureDevices = parseAlsaDevices(captureOut, 'capture');
      
      if (captureDevices.length > 0) {
        logger.info(`Found ${captureDevices.length} ALSA capture devices`);
        return { playback: playbackDevices, capture: captureDevices };
      }
    } catch (alsaError) {
      logger.debug('ALSA capture enumeration failed, trying PulseAudio:', alsaError);
    }

    // If ALSA capture failed, try PulseAudio (though IDs may not work with arecord)
    try {
      const { stdout: sourceOut } = await execAsync('pactl list short sources 2>/dev/null');
      const pulseDevices = parsePulseDevices(sourceOut, 'capture');
      
      if (pulseDevices.length > 0) {
        logger.warn('Using PulseAudio device IDs for capture - may not work with arecord');
        return { playback: playbackDevices, capture: pulseDevices };
      }
    } catch {}

    // If no playback devices found from PulseAudio, try ALSA
    if (playbackDevices.length === 0) {
      try {
        const { stdout } = await execAsync('aplay -l 2>/dev/null');
        playbackDevices = parseAlsaDevices(stdout, 'playback');
      } catch {}
    }

    if (captureDevices.length === 0 && playbackDevices.length === 0) {
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
    }

    return { playback: playbackDevices, capture: captureDevices };
  } catch (error) {
    logger.error('Failed to get audio devices', error);
    return { playback: [], capture: [] };
  }
}

// Enable all available audio cards to make them available as sinks
async function enableAllAudioCards(): Promise<void> {
  try {
    // Get list of all cards
    const { stdout: cardsOut } = await execAsync('pactl list cards short 2>/dev/null');
    const cardLines = cardsOut.split('\n').filter(line => line.trim());
    
    for (const line of cardLines) {
      const parts = line.split('\t');
      if (parts.length >= 2) {
        const cardName = parts[0];
        
        // Try to enable the card with the best available profile
        try {
          // Get available profiles for this card
          const { stdout: profilesOut } = await execAsync(`pactl list cards | grep -A 20 "Name: ${cardName}" | grep "Profiles:" -A 10 2>/dev/null`);
          
          // Look for output profiles (containing "sinks:")
          const outputProfiles = profilesOut.match(/(\w+):\s*[^(]*\([^)]*sinks:\s*\d+[^)]*\)/g);
          
          if (outputProfiles && outputProfiles.length > 0) {
            // Use the first available output profile
            const profileName = outputProfiles[0].split(':')[0];
            await execAsync(`pactl set-card-profile ${cardName} ${profileName} 2>/dev/null`);
            logger.info(`Enabled card ${cardName} with profile ${profileName}`);
          }
        } catch (error) {
          // Ignore errors for individual cards
          logger.debug(`Could not enable card ${cardName}: ${error}`);
        }
      }
    }
  } catch (error) {
    logger.debug('Could not enable audio cards:', error);
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
      const technicalName = match[2];
      const name = getFriendlyDeviceName(technicalName, type);
      
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
      const technicalName = parts[1];
      const friendlyName = getFriendlyDeviceName(technicalName, type);
      
      devices.push({
        id: parts[0],
        name: friendlyName,
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
        audioMode: 'browser',
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
        audioMode: 'browser',
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
      audioMode: 'browser',
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
      audioMode: 'browser',
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

// Set default audio output device
export async function setDefaultOutputDevice(deviceId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Try PulseAudio first
    try {
      await execAsync(`pactl set-default-sink ${deviceId} 2>/dev/null`);
      logger.info(`Set default output device to ${deviceId}`);
      return { success: true };
    } catch {}

    // Try ALSA (less reliable for device switching)
    try {
      // For ALSA, we can try to set the card, but this is more complex
      const cardMatch = deviceId.match(/hw:(\d+),/);
      if (cardMatch) {
        const cardNum = cardMatch[1];
        await execAsync(`amixer -c ${cardNum} set Master unmute 2>/dev/null`);
        logger.info(`Set ALSA card ${cardNum} as active`);
        return { success: true };
      }
    } catch {}

    return { success: false, error: 'No audio system available for device switching' };
  } catch (error: any) {
    logger.error('Failed to set default output device', error);
    return { success: false, error: error.message || 'Failed to set default device' };
  }
}

// Set default audio input device
export async function setDefaultInputDevice(deviceId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Try PulseAudio first
    try {
      await execAsync(`pactl set-default-source ${deviceId} 2>/dev/null`);
      logger.info(`Set default input device to ${deviceId}`);
      return { success: true };
    } catch {}

    // Try ALSA (less reliable for device switching)
    try {
      const cardMatch = deviceId.match(/hw:(\d+),/);
      if (cardMatch) {
        const cardNum = cardMatch[1];
        await execAsync(`amixer -c ${cardNum} set Capture unmute 2>/dev/null`);
        logger.info(`Set ALSA card ${cardNum} as active for input`);
        return { success: true };
      }
    } catch {}

    return { success: false, error: 'No audio system available for device switching' };
  } catch (error: any) {
    logger.error('Failed to set default input device', error);
    return { success: false, error: error.message || 'Failed to set default device' };
  }
}

// Set audio output mode (browser or device)
export async function setAudioMode(mode: 'browser' | 'device'): Promise<{ success: boolean; error?: string }> {
  try {
    // For now, we'll store this in a simple way. In a real implementation,
    // you might want to store this in a database or config file
    logger.info(`Audio mode set to: ${mode}`);
    return { success: true };
  } catch (error: any) {
    logger.error('Failed to set audio mode', error);
    return { success: false, error: error.message || 'Failed to set audio mode' };
  }
}

// Play audio file on device (server-side playback)
export async function playAudioOnDevice(filePath: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Convert relative path to absolute path if needed
    let absolutePath = filePath;
    if (filePath.startsWith('/uploads/')) {
      // Convert relative path like /uploads/music/file.mp3 to absolute path
      absolutePath = `${process.cwd()}/public${filePath}`;
    }
    
    // Check if file exists
    const fs = await import('fs');
    if (!fs.existsSync(absolutePath)) {
      logger.error(`Audio file not found: ${absolutePath}`);
      return { success: false, error: 'Audio file not found' };
    }

    // Use paplay for audio playback (works best with PulseAudio/PipeWire)
    try {
      logger.info(`Attempting to play with paplay: ${absolutePath}`);
      
      // Use shell script to ensure proper background execution
      const { stdout } = await execAsync(`bash /home/raouf/yoyo/yoy_dash/play_audio.sh "${absolutePath}"`);
      logger.info(`Shell script output: ${stdout}`);
      logger.info(`Playing audio file on device: ${absolutePath}`);
      
      return { success: true };
    } catch (error) {
      logger.error(`paplay failed: ${error}`);
    }

    return { success: false, error: 'No compatible audio player found' };
  } catch (error: any) {
    logger.error('Failed to play audio on device', error);
    return { success: false, error: error.message || 'Failed to play audio on device' };
  }
}

// Stop device audio playback
export async function stopDeviceAudio(): Promise<{ success: boolean; error?: string }> {
  try {
    // Kill common audio players
    try {
      await execAsync('pkill mpv 2>/dev/null || true');
      await execAsync('pkill mplayer 2>/dev/null || true');
      await execAsync('pkill aplay 2>/dev/null || true');
      await execAsync('pkill paplay 2>/dev/null || true');
      logger.info('Stopped device audio playback');
      return { success: true };
    } catch (error) {
      logger.warn('Error stopping audio players:', error);
    }

    return { success: true }; // Always return success for stop command
  } catch (error: any) {
    logger.error('Failed to stop device audio', error);
    return { success: false, error: error.message || 'Failed to stop device audio' };
  }
}

// Record audio test (capture for 3 seconds)
export async function recordTestAudio(): Promise<{ success: boolean; error?: string }> {
  try {
    // Record 3 seconds of audio to test microphone
    // Use mono format (-c 1) for better compatibility with USB microphones
    // Try to record from USB device (hw:3) first, fall back to default
    try {
      await execAsync('timeout 3 arecord -d 3 -c 1 -f dat -D hw:3,0 /tmp/audio_test.wav 2>/dev/null || true');
    } catch {
      // Fallback to default device if USB not available
      await execAsync('timeout 3 arecord -d 3 -c 1 -f dat /tmp/audio_test.wav 2>/dev/null || true');
    }
    logger.info('Recorded test audio');
    return { success: true };
  } catch (error: any) {
    logger.error('Failed to record test audio', error);
    return { success: false, error: error.message || 'Failed to record audio' };
  }
}

// Play back the recorded test audio
export async function playRecordedTestAudio(): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if test audio file exists
    const { stdout } = await execAsync('[ -f /tmp/audio_test.wav ] && echo "exists" || echo "not found"');
    if (stdout.includes('not found')) {
      return { success: false, error: 'No recorded test audio found. Record audio first.' };
    }
    
    // Play the recorded test audio using aplay
    await execAsync('aplay /tmp/audio_test.wav 2>/dev/null &');
    logger.info('Playing recorded test audio');
    return { success: true };
  } catch (error: any) {
    logger.error('Failed to play recorded test audio', error);
    return { success: false, error: error.message || 'Failed to play recorded audio' };
  }
}

// Start live microphone listening (streams raw audio data)
export async function startMicrophoneListener(): Promise<{ success: boolean; error?: string }> {
  try {
    // Start streaming microphone audio (30 seconds max)
    // This pipes the audio to a named pipe that the frontend can read
    await execAsync('timeout 30 arecord -f cd -t raw 2>/dev/null > /tmp/mic_stream.raw &');
    logger.info('Started microphone listener');
    return { success: true };
  } catch (error: any) {
    logger.error('Failed to start microphone listener', error);
    return { success: false, error: error.message || 'Failed to start listener' };
  }
}

// Stop microphone listening
export async function stopMicrophoneListener(): Promise<{ success: boolean; error?: string }> {
  try {
    // Kill the arecord process
    await execAsync('pkill -f "arecord.*mic_stream" 2>/dev/null || true');
    logger.info('Stopped microphone listener');
    return { success: true };
  } catch (error: any) {
    logger.error('Failed to stop microphone listener', error);
    return { success: false, error: error.message || 'Failed to stop listener' };
  }
}
