import { spawn, type ChildProcess } from 'child_process';
import type { WebSocket } from 'ws';

let arecordProcess: ChildProcess | null = null;
let clientCount = 0;
const clients = new Set<WebSocket>();

/**
 * Start audio capture from USB microphone
 * Uses arecord to capture 16-bit PCM audio at 16kHz mono
 */
export function startAudioCapture() {
  console.log('Starting microphone audio capture...');

  // Capture audio using arecord
  // Format: 16-bit PCM, mono, 16kHz (good balance for voice and bandwidth)
  arecordProcess = spawn('arecord', [
    '-D', 'plughw:3,0',  // Use the USB device (card 3, device 0)
    '-f', 'S16_LE',      // 16-bit signed little-endian
    '-c', '1',           // Mono
    '-r', '16000',       // 16kHz sample rate
    '-t', 'raw'          // Raw output (no WAV header)
  ]);

  // Broadcast audio data to all connected WebSocket clients
  arecordProcess.stdout?.on('data', (data: Buffer) => {
    clients.forEach((client) => {
      // WebSocket.OPEN === 1
      if (client.readyState === 1) {
        client.send(data);
      }
    });
  });

  arecordProcess.stderr?.on('data', (data: Buffer) => {
    console.error(`arecord error: ${data.toString()}`);
  });

  arecordProcess.on('close', (code) => {
    console.log(`arecord process exited with code ${code}`);
    arecordProcess = null;
  });

  arecordProcess.on('error', (error) => {
    console.error('Failed to start arecord:', error);
    arecordProcess = null;
  });
}

/**
 * Stop audio capture process
 */
export function stopAudioCapture() {
  if (arecordProcess) {
    console.log('Stopping microphone audio capture...');
    arecordProcess.kill();
    arecordProcess = null;
  }
}

/**
 * Handle new WebSocket connection for microphone streaming
 * @param ws - WebSocket connection
 */
export function handleMicrophoneConnection(ws: WebSocket) {
  clientCount++;
  clients.add(ws);
  console.log(`Microphone client connected. Total clients: ${clientCount}`);

  // Start audio capture when first client connects
  if (clientCount === 1) {
    startAudioCapture();
  }

  // Handle client disconnect
  ws.on('close', () => {
    clientCount--;
    clients.delete(ws);
    console.log(`Microphone client disconnected. Total clients: ${clientCount}`);

    // Stop audio capture when no clients are connected
    if (clientCount === 0) {
      stopAudioCapture();
    }
  });

  // Handle WebSocket errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
    clientCount = Math.max(0, clientCount - 1);

    if (clientCount === 0) {
      stopAudioCapture();
    }
  });
}

/**
 * Cleanup all connections and audio processes
 * Called on server shutdown
 */
export function cleanup() {
  console.log('Cleaning up microphone streaming service...');
  stopAudioCapture();

  // Close all WebSocket connections
  clients.forEach((client) => {
    try {
      client.close();
    } catch (error) {
      console.error('Error closing WebSocket:', error);
    }
  });

  clients.clear();
  clientCount = 0;
}
