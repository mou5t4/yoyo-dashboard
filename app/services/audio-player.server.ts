/**
 * Audio Player Service with Pause/Resume Support
 * Uses mpv player with JSON IPC for full control
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, unlinkSync } from 'fs';
import { logger } from '~/lib/logger.server';

const execAsync = promisify(exec);

const MPV_SOCKET = '/tmp/mpv-socket';
const MPV_STATE_FILE = '/tmp/mpv-state.json';

interface PlayerState {
  filePath: string;
  position: number; // Current playback position in seconds
  isPaused: boolean;
}

// Send command to mpv via JSON IPC
async function sendMpvCommand(command: any): Promise<any> {
  try {
    const cmdJson = JSON.stringify(command);
    const escapedCmd = cmdJson.replace(/"/g, '\\"');
    const { stdout } = await execAsync(`echo '${cmdJson}' | socat - ${MPV_SOCKET} 2>/dev/null`);

    if (stdout.trim()) {
      try {
        return JSON.parse(stdout);
      } catch {
        return { data: stdout };
      }
    }
    return null;
  } catch (error) {
    logger.debug('MPV command failed:', error);
    return null;
  }
}

// Get current playback position from mpv
async function getMpvPosition(): Promise<number | null> {
  try {
    const result = await sendMpvCommand({ command: ['get_property', 'time-pos'] });
    if (result && typeof result.data === 'number') {
      return result.data;
    }
  } catch (error) {
    logger.debug('Failed to get mpv position:', error);
  }
  return null;
}

// Check if mpv is running and responsive
async function isMpvRunning(): Promise<boolean> {
  try {
    const { stdout } = await execAsync('pgrep mpv 2>/dev/null');
    if (!stdout.trim()) return false;

    // Check if socket exists and is responsive
    if (!existsSync(MPV_SOCKET)) return false;

    const result = await sendMpvCommand({ command: ['get_property', 'pause'] });
    return result !== null;
  } catch {
    return false;
  }
}

// Save current player state
async function savePlayerState(filePath: string, position: number, isPaused: boolean): Promise<void> {
  try {
    const state: PlayerState = { filePath, position, isPaused };
    await execAsync(`echo '${JSON.stringify(state)}' > ${MPV_STATE_FILE}`);
  } catch (error) {
    logger.warn('Failed to save player state:', error);
  }
}

// Load saved player state
async function loadPlayerState(): Promise<PlayerState | null> {
  try {
    if (!existsSync(MPV_STATE_FILE)) return null;
    const { stdout } = await execAsync(`cat ${MPV_STATE_FILE} 2>/dev/null`);
    if (!stdout.trim()) return null;
    return JSON.parse(stdout);
  } catch (error) {
    logger.debug('Failed to load player state:', error);
    return null;
  }
}

// Clear saved player state
async function clearPlayerState(): Promise<void> {
  try {
    if (existsSync(MPV_STATE_FILE)) {
      unlinkSync(MPV_STATE_FILE);
    }
  } catch (error) {
    logger.debug('Failed to clear player state:', error);
  }
}

/**
 * Play audio file on device with pause/resume support
 */
export async function playAudioOnDevice(filePath: string, seekPosition?: number): Promise<{ success: boolean; error?: string }> {
  try {
    // Convert relative path to absolute path
    let absolutePath = filePath;
    if (filePath.startsWith('/uploads/')) {
      // Convert relative path like /uploads/music/file.mp3 to absolute path
      absolutePath = `${process.cwd()}/public${filePath}`;
    }

    // Check if file exists
    if (!existsSync(absolutePath)) {
      logger.error(`Audio file not found: ${absolutePath}`);
      return { success: false, error: 'Audio file not found' };
    }

    // Stop any existing playback
    await stopDeviceAudio();

    // Wait a moment for cleanup
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check if mpv is available
    try {
      await execAsync('which mpv 2>/dev/null');
    } catch {
      logger.warn('mpv not found, falling back to paplay');
      // Fallback to paplay without pause/resume support
      try {
        await execAsync(`paplay "${absolutePath}" </dev/null >/dev/null 2>&1 &`);
        logger.info(`Playing with paplay: ${absolutePath}`);
        return { success: true };
      } catch (error) {
        logger.error(`paplay failed: ${error}`);
        return { success: false, error: 'No audio player available' };
      }
    }

    // Start mpv with JSON IPC
    const seekArg = seekPosition !== undefined && seekPosition > 0 ? `--start=${seekPosition}` : '';
    const cmd = `mpv --no-video --audio-display=no --input-ipc-server=${MPV_SOCKET} --really-quiet ${seekArg} "${absolutePath}" </dev/null >/dev/null 2>&1 &`;

    logger.info(`Starting mpv: ${absolutePath}${seekPosition ? ` at ${seekPosition}s` : ''}`);
    await execAsync(cmd);

    // Wait for mpv to start
    let retries = 10;
    while (retries > 0 && !await isMpvRunning()) {
      await new Promise(resolve => setTimeout(resolve, 100));
      retries--;
    }

    if (!await isMpvRunning()) {
      logger.error('mpv failed to start');
      return { success: false, error: 'Audio player failed to start' };
    }

    // Save state
    await savePlayerState(absolutePath, seekPosition || 0, false);

    logger.info(`Playing audio file: ${absolutePath}`);
    return { success: true };
  } catch (error: any) {
    logger.error('Failed to play audio:', error);
    return { success: false, error: error.message || 'Failed to play audio' };
  }
}

/**
 * Pause device audio playback
 */
export async function pauseDeviceAudio(): Promise<{ success: boolean; position?: number; error?: string }> {
  try {
    if (!await isMpvRunning()) {
      return { success: false, error: 'No audio playing' };
    }

    // Get current position before pausing
    const position = await getMpvPosition();

    // Send pause command
    await sendMpvCommand({ command: ['set_property', 'pause', true] });

    // Update state
    const state = await loadPlayerState();
    if (state && position !== null) {
      await savePlayerState(state.filePath, position, true);
    }

    logger.info(`Paused playback at ${position}s`);
    return { success: true, position: position || 0 };
  } catch (error: any) {
    logger.error('Failed to pause audio:', error);
    return { success: false, error: error.message || 'Failed to pause' };
  }
}

/**
 * Resume device audio playback
 */
export async function resumeDeviceAudio(): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if mpv is running and paused
    if (await isMpvRunning()) {
      // Resume existing mpv instance
      await sendMpvCommand({ command: ['set_property', 'pause', false] });

      // Update state
      const state = await loadPlayerState();
      if (state) {
        await savePlayerState(state.filePath, state.position, false);
      }

      logger.info('Resumed playback');
      return { success: true };
    }

    // Load last state and resume from saved position
    const state = await loadPlayerState();
    if (!state) {
      return { success: false, error: 'No paused audio to resume' };
    }

    // Resume by starting from saved position
    return await playAudioOnDevice(state.filePath, state.position);
  } catch (error: any) {
    logger.error('Failed to resume audio:', error);
    return { success: false, error: error.message || 'Failed to resume' };
  }
}

/**
 * Stop device audio playback completely
 */
export async function stopDeviceAudio(): Promise<{ success: boolean; error?: string }> {
  try {
    // Clear saved state
    await clearPlayerState();

    // Remove socket
    try {
      if (existsSync(MPV_SOCKET)) {
        unlinkSync(MPV_SOCKET);
      }
    } catch {}

    // Kill audio players
    await execAsync('pkill mpv 2>/dev/null || true');
    await execAsync('pkill mplayer 2>/dev/null || true');
    await execAsync('pkill aplay 2>/dev/null || true');
    await execAsync('pkill paplay 2>/dev/null || true');

    logger.info('Stopped device audio playback');
    return { success: true };
  } catch (error: any) {
    logger.error('Failed to stop device audio:', error);
    return { success: false, error: error.message || 'Failed to stop' };
  }
}

/**
 * Get current playback state
 */
export async function getPlaybackState(): Promise<{ isPlaying: boolean; position?: number; filePath?: string }> {
  try {
    if (!await isMpvRunning()) {
      return { isPlaying: false };
    }

    const position = await getMpvPosition();
    const isPausedResult = await sendMpvCommand({ command: ['get_property', 'pause'] });
    const isPaused = isPausedResult?.data === true;

    const state = await loadPlayerState();

    return {
      isPlaying: !isPaused,
      position: position || undefined,
      filePath: state?.filePath
    };
  } catch (error) {
    logger.debug('Failed to get playback state:', error);
    return { isPlaying: false };
  }
}
