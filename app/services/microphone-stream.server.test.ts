import { describe, it, expect, vi } from 'vitest';

describe('Microphone Stream Server - Basic Tests', () => {
  it('should export required functions', async () => {
    const module = await import('./microphone-stream.server');

    expect(module.startAudioCapture).toBeDefined();
    expect(module.stopAudioCapture).toBeDefined();
    expect(module.handleMicrophoneConnection).toBeDefined();
    expect(module.cleanup).toBeDefined();
  });

  it('should have correct function types', async () => {
    const module = await import('./microphone-stream.server');

    expect(typeof module.startAudioCapture).toBe('function');
    expect(typeof module.stopAudioCapture).toBe('function');
    expect(typeof module.handleMicrophoneConnection).toBe('function');
    expect(typeof module.cleanup).toBe('function');
  });
});
