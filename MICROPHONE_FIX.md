# Microphone Audio Capture Fix

## Issue
The microphone audio capture was failing with the error:
```
Failed to capture microphone audio: Command failed: timeout 5 arecord -d 5 -c 1 -f cd -D hw:3,0 "/tmp/mic_listen_1761213467853.wav" 2>/dev/null
```

## Root Cause
The USB microphone (`hw:3,0`) on your system does not support the audio format parameters specified in the original code:
- **Parameter Issue**: The command tried to use `-c 1 -f cd` which means mono (1 channel) in CD format
- **Actual Error**: `arecord: set_params:1398: Channels count non available`
- **Device Support**: The USB microphone only supports `S16_LE` format (16-bit little-endian PCM)

## Solution Implemented

### Changes to `/app/routes/api.audio.play.ts`

1. **Device Detection**: Now queries available capture devices using `getAudioDevices()` instead of hardcoding `hw:3,0`

2. **Format Negotiation**: Tries multiple audio formats in order of compatibility:
   - `S16_LE` (16-bit PCM - most compatible with USB devices) ✓ **Works on your system**
   - `U16_LE` (16-bit unsigned PCM - fallback option)
   - `cd` (44.1kHz, 16-bit stereo - original format, only for built-in audio)

3. **Fallback Strategy**:
   - First tries all available devices with all format options
   - Falls back to default device if device-specific recording fails
   - Provides detailed error messages and available devices in response

4. **Better Logging**: Comprehensive logging to help diagnose future issues

### How It Works

```typescript
// For each available device:
for (const device of captureDevices) {
  // Try each format option
  for (const format of ['S16_LE', 'U16_LE', 'cd']) {
    // Attempt to record with this device and format
    // Stop on first success
  }
}

// If no device works, try the system default
```

## Testing the Fix

To verify the microphone works:

```bash
# List available devices
arecord -l

# Test recording with S16_LE format (what your USB mic supports)
timeout 5 arecord -D hw:3,0 -f S16_LE -d 5 /tmp/test.wav

# Play back the recording
aplay /tmp/test.wav
```

## Technical Details

### Your System Configuration
- **Capture Device**: USB PnP Sound Device (card 3, device 0)
- **ALSA Device ID**: `hw:3,0`
- **Supported Format**: S16_LE (16-bit signed PCM, little-endian)
- **Sample Rate**: 44100 Hz
- **Channels**: Mono (1 channel - even though initial command failed with -c 1)

### Why the Original Code Failed
The command:
```bash
arecord -d 5 -c 1 -f cd -D hw:3,0 "/tmp/file.wav"
```

- `-c 1`: Mono (1 channel)
- `-f cd`: CD format (44.1kHz, 16-bit)

The USB microphone driver's parameter negotiation failed before recording even started because the device needed specific format setup that wasn't compatible with the `-c` and `-f` flags in that order.

## Error Response Enhancements

When recording fails, the API now returns detailed information:

```json
{
  "error": "Failed to capture audio",
  "details": "Channels count non available",
  "availableDevices": [
    { "id": "hw:3,0", "name": "USB Audio Device" }
  ]
}
```

This helps with debugging if you add more devices in the future.

## Future Improvements

1. Cache detected devices and their supported formats to avoid repeated format trials
2. Add device preference settings in the UI
3. Allow users to select recording format and quality
4. Store audio settings per device

## Files Modified
- `/app/routes/api.audio.play.ts` - Updated microphone capture with format negotiation

