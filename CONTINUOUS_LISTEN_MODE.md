# Continuous Microphone Listen Mode

## Overview
The application now supports continuous microphone listening that streams audio from your microphone and plays it back in real-time. The listen mode stays active until you explicitly click the "Stop Listening" button.

## Features
- **Continuous Streaming**: Audio streams continuously without stopping after a fixed duration
- **User Control**: Listening stops only when the user clicks the "Stop Listening" button
- **Device Detection**: Automatically detects and uses available capture devices
- **Format Negotiation**: Tries multiple audio formats for compatibility with various USB microphones
- **Real-time Playback**: Audio is played back as it's captured
- **Graceful Shutdown**: Properly stops the stream and cleans up resources when stopped

## How It Works

### Architecture

```
[Microphone Device]
        ↓
[arecord (ALSA)]
        ↓
[/api/audio/stream?type=live-mic] (Streaming Endpoint)
        ↓
[Audio HTML Element]
        ↓
[Speaker Output]
```

### Backend Flow

1. **Request arrives at `/api/audio/stream?type=live-mic`**
2. **Device Detection**: Queries available audio capture devices
3. **Format Negotiation**: Tries formats in order: S16_LE → U16_LE → cd
4. **Continuous Recording**: Starts `arecord` process without timeout
5. **Streaming**: Sends audio data as ReadableStream
6. **Client Disconnect**: Kills arecord process when client disconnects

### Frontend Flow

1. **User clicks "Listen Mode" button**
2. **AbortController Created**: Allows stopping the stream later
3. **Audio Element Setup**: Creates HTML audio element pointing to stream endpoint
4. **Playback Started**: Audio automatically plays back as data arrives
5. **Continuous Playback**: Audio continues streaming and playing until stopped
6. **User clicks "Stop Listening"**:
   - Abort signal sent to stop fetch
   - Audio element paused
   - Stream cleaned up

## Files Modified

### Backend Changes
- **`/app/routes/api.audio.stream.ts`**: 
  - New `live-mic` stream type for continuous microphone streaming
  - Replaced 30-second timeout with indefinite streaming
  - Handles client abort signals to stop recording

### Frontend Changes
- **`/app/routes/_auth.audio.tsx`**:
  - Added `listeningAbortController` state to track stream
  - Updated `handleStartListening`: Creates audio element, sets stream URL, starts playback
  - Updated `handleStopListening`: Aborts stream, stops audio, cleans up resources
  - UI button toggles between "Listen Mode" and "Stop Listening" based on `isListening` state

## Technical Details

### Audio Format Support
The implementation tries multiple audio formats for maximum device compatibility:

1. **S16_LE** (16-bit signed PCM, little-endian)
   - Most compatible with USB microphones
   - Used by your USB PnP Sound Device
   - Sample rate: 44100 Hz

2. **U16_LE** (16-bit unsigned PCM, little-endian)
   - Fallback option for compatibility

3. **cd** (CD quality format)
   - 44.1 kHz, 16-bit stereo
   - Works with built-in audio devices
   - Fallback for system default device

### Stream Handling

**Server Side**:
```typescript
// Continuous streaming - no timeout
exec('arecord -D "hw:3,0" -f S16_LE 2>/dev/null')

// Handles client abort
request.signal.addEventListener('abort', () => {
  recordingProcess.kill('SIGTERM');
  controller.close();
});
```

**Client Side**:
```typescript
// Abort controller for user control
const abortController = new AbortController();

// Audio element that streams indefinitely
const audio = new Audio();
audio.src = '/api/audio/stream?type=live-mic';
await audio.play();

// Stop when user clicks button
abortController.abort();
audio.pause();
```

## Usage

### In the UI
1. Navigate to the Audio page
2. Locate the "Listen Mode" / "Stop Listening" button
3. Click "Listen Mode" to start continuous listening
4. Your microphone audio will play through your speakers immediately
5. Click "Stop Listening" to end the stream

### Command Line (for testing)
```bash
# Start continuous recording
arecord -D hw:3,0 -f S16_LE > /tmp/continuous_recording.wav

# This will record indefinitely until you press Ctrl+C

# Play it back
aplay /tmp/continuous_recording.wav
```

## Device Information

Your system has:
- **Audio Input Device**: USB PnP Sound Device (hw:3,0)
- **Supported Format**: S16_LE
- **Sample Rate**: 44100 Hz
- **Channels**: Mono

## Error Handling

If listening fails to start, check:

1. **Device Availability**
   ```bash
   arecord -l
   ```
   Should show your USB microphone

2. **Format Compatibility**
   ```bash
   timeout 5 arecord -D hw:3,0 -f S16_LE -d 5 /tmp/test.wav
   ```
   Should create an audio file without errors

3. **Permissions**
   - User should have access to `/dev/snd/*` devices
   - Run: `ls -la /dev/snd/`

4. **Browser Audio Playback**
   - Check browser autoplay permissions
   - May require user gesture to start playback

## Performance Considerations

- **Memory**: Stream buffers are manageable (audio is played back in chunks)
- **CPU**: Minimal impact - arecord is efficient, streaming is passive
- **Network**: N/A (local streaming only)
- **Disk**: No disk space used (stream is ephemeral)

## Troubleshooting

### "Cannot play audio" Error
- **Cause**: Browser autoplay policy or permissions
- **Solution**: Check browser settings, may require explicit permission

### No audio output from microphone
- **Cause**: Microphone not selected or muted
- **Solution**: 
  - Check audio input device selection
  - Verify microphone is not muted at OS level

### Stream stops suddenly
- **Cause**: Device disconnected or permission lost
- **Solution**: 
  - Reconnect device
  - Check system audio settings
  - Restart application

### "Channels count non available" Error
- **Cause**: Device doesn't support the audio format
- **Solution**: Uses fallback format automatically, should work with any device

## Future Improvements

1. **Audio Visualization**: Add waveform display while listening
2. **Recording Option**: Allow recording the live stream
3. **Device Selection**: Let users choose input device
4. **Format Selection**: Allow user to select audio quality/format
5. **Volume Control**: Adjust microphone input volume
6. **Latency Optimization**: Minimize streaming latency
7. **Audio Filters**: Add noise cancellation or effects

## Related Files

- `MICROPHONE_FIX.md` - Details about the microphone format fix
- `/app/services/audio.service.server.ts` - Audio device management
- `/app/routes/api.audio.stream.ts` - Streaming endpoint
- `/app/routes/_auth.audio.tsx` - Audio page UI

## Changelog

### Version 1.0 (Current)
- ✅ Continuous microphone streaming
- ✅ Real-time playback
- ✅ User-controlled start/stop
- ✅ Multiple format support
- ✅ Device auto-detection
- ✅ Graceful error handling

