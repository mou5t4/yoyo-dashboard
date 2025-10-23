import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { getAudioDevices, getAudioSettings, setVolume, setMute, playTestSound, recordTestAudio, setDefaultOutputDevice, setDefaultInputDevice, setAudioMode, playRecordedTestAudio, startMicrophoneListener, stopMicrophoneListener } from "~/services/audio.service.server";
import { Volume2, VolumeX, Mic, MicOff, Play, Radio, CheckCircle2, XCircle, Speaker, Activity, Square } from "lucide-react";

// Import new components
import { CircularVolumeKnob } from "~/components/audio/CircularVolumeKnob";
import { AudioVisualizer } from "~/components/audio/AudioVisualizer";
import { AudioDeviceGrid } from "~/components/audio/AudioDeviceCard";
import { useAudioMode } from "~/contexts/AudioModeContext";

export async function loader({ request }: LoaderFunctionArgs) {
  const devices = await getAudioDevices();
  const settings = await getAudioSettings();

  return json({ devices, settings });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "set-output-volume") {
    const volume = Number(formData.get("volume"));
    const result = await setVolume(volume, 'output');
    if (result.success) {
      return json({ success: true, message: `Output volume set to ${volume}%` });
    }
    return json({ success: false, error: result.error }, { status: 400 });
  }

  if (intent === "set-input-volume") {
    const volume = Number(formData.get("volume"));
    const result = await setVolume(volume, 'input');
    if (result.success) {
      return json({ success: true, message: `Input volume set to ${volume}%` });
    }
    return json({ success: false, error: result.error }, { status: 400 });
  }

  if (intent === "toggle-output-mute") {
    const muted = formData.get("muted") === "true";
    const result = await setMute(muted, 'output');
    if (result.success) {
      return json({ success: true, message: muted ? 'Output muted' : 'Output unmuted' });
    }
    return json({ success: false, error: result.error }, { status: 400 });
  }

  if (intent === "toggle-input-mute") {
    const muted = formData.get("muted") === "true";
    const result = await setMute(muted, 'input');
    if (result.success) {
      return json({ success: true, message: muted ? 'Input muted' : 'Input unmuted' });
    }
    return json({ success: false, error: result.error }, { status: 400 });
  }

  if (intent === "test-output") {
    const result = await playTestSound();
    if (result.success) {
      return json({ success: true, message: 'Playing test sound...' });
    }
    return json({ success: false, error: result.error }, { status: 400 });
  }

  if (intent === "test-input") {
    const result = await recordTestAudio();
    if (result.success) {
      return json({ success: true, message: 'Recording test audio for 3 seconds...' });
    }
    return json({ success: false, error: result.error }, { status: 400 });
  }

  if (intent === "play-recorded-audio") {
    const result = await playRecordedTestAudio();
    if (result.success) {
      return json({ success: true, message: 'Playing recorded test audio...' });
    }
    return json({ success: false, error: result.error }, { status: 400 });
  }

  if (intent === "start-mic-listen") {
    const result = await startMicrophoneListener();
    if (result.success) {
      return json({ success: true, message: 'Listening to microphone...' });
    }
    return json({ success: false, error: result.error }, { status: 400 });
  }

  if (intent === "stop-mic-listen") {
    const result = await stopMicrophoneListener();
    if (result.success) {
      return json({ success: true, message: 'Stopped listening to microphone' });
    }
    return json({ success: false, error: result.error }, { status: 400 });
  }

  if (intent === "set-output-device") {
    const deviceId = formData.get("deviceId") as string;
    
    if (!deviceId) {
      return json({ error: "Device ID is required", success: false }, { status: 400 });
    }

    const result = await setDefaultOutputDevice(deviceId);
    if (result.success) {
      return json({ success: true, message: `Output device set to ${deviceId}` });
    }
    return json({ success: false, error: result.error }, { status: 400 });
  }

  if (intent === "set-input-device") {
    const deviceId = formData.get("deviceId") as string;
    
    if (!deviceId) {
      return json({ error: "Device ID is required", success: false }, { status: 400 });
    }

    const result = await setDefaultInputDevice(deviceId);
    if (result.success) {
      return json({ success: true, message: `Input device set to ${deviceId}` });
    }
    return json({ success: false, error: result.error }, { status: 400 });
  }

  if (intent === "set-audio-mode") {
    const mode = formData.get("mode") as "browser" | "device";
    
    if (!mode || !["browser", "device"].includes(mode)) {
      return json({ error: "Invalid audio mode", success: false }, { status: 400 });
    }

    const result = await setAudioMode(mode);
    if (result.success) {
      return json({ success: true, message: `Audio mode set to ${mode}` });
    }
    return json({ success: false, error: result.error }, { status: 400 });
  }

  return json({ error: "Invalid action", success: false }, { status: 400 });
}

export default function AudioPage() {
  const { devices, settings } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [outputVolume, setOutputVolume] = useState(settings.outputVolume);
  const [inputVolume, setInputVolume] = useState(settings.inputVolume);
  const [outputMuted, setOutputMuted] = useState(settings.outputMuted);
  const [inputMuted, setInputMuted] = useState(settings.inputMuted);
  
  // Animation states
  const [isTestingOutput, setIsTestingOutput] = useState(false);
  const [isTestingInput, setIsTestingInput] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [listeningAudio, setListeningAudio] = useState<HTMLAudioElement | null>(null);
  const [listeningAbortController, setListeningAbortController] = useState<AbortController | null>(null);
  
  const { t } = useTranslation();
  const { audioMode, setAudioMode } = useAudioMode();

  // Prepare device data for new components
  const outputDevices = devices.playback.map(device => ({
    ...device,
    type: 'playback' as const
  }));

  const inputDevices = devices.capture.map(device => ({
    ...device,
    type: 'capture' as const
  }));

  // Initialize selected devices with the default ones from the server
  const [selectedOutputDevice, setSelectedOutputDevice] = useState<string | null>(() => {
    // First try to find the device marked as default by the server
    const defaultDevice = outputDevices.find(d => d.isDefault);
    if (defaultDevice) return defaultDevice.id;
    
    // Fallback to localStorage (user's last selection)
    const savedDevice = typeof window !== 'undefined' ? localStorage.getItem('selectedOutputDevice') : null;
    if (savedDevice && outputDevices.some(d => d.id === savedDevice)) {
      return savedDevice;
    }
    
    // Last resort: use first device
    return outputDevices.length > 0 ? outputDevices[0].id : null;
  });
  
  const [selectedInputDevice, setSelectedInputDevice] = useState<string | null>(() => {
    // First try to find the device marked as default by the server
    const defaultDevice = inputDevices.find(d => d.isDefault);
    if (defaultDevice) return defaultDevice.id;
    
    // Fallback to localStorage (user's last selection)
    const savedDevice = typeof window !== 'undefined' ? localStorage.getItem('selectedInputDevice') : null;
    if (savedDevice && inputDevices.some(d => d.id === savedDevice)) {
      return savedDevice;
    }
    
    // Last resort: use first device
    return inputDevices.length > 0 ? inputDevices[0].id : null;
  });

  // Save selected devices to localStorage when they change
  useEffect(() => {
    if (selectedOutputDevice) {
      localStorage.setItem('selectedOutputDevice', selectedOutputDevice);
    }
  }, [selectedOutputDevice]);

  useEffect(() => {
    if (selectedInputDevice) {
      localStorage.setItem('selectedInputDevice', selectedInputDevice);
    }
  }, [selectedInputDevice]);

  // Sync selected devices from settings when action completes
  useEffect(() => {
    if (actionData?.success && 'message' in actionData) {
      // If a device was successfully changed, update the selected device
      if (actionData.message?.includes('Output device')) {
        // Find which device is now marked as default
        const defaultOutput = outputDevices.find(d => d.isDefault);
        if (defaultOutput) {
          setSelectedOutputDevice(defaultOutput.id);
        }
      } else if (actionData.message?.includes('Input device')) {
        const defaultInput = inputDevices.find(d => d.isDefault);
        if (defaultInput) {
          setSelectedInputDevice(defaultInput.id);
        }
      }
    }
  }, [actionData, outputDevices, inputDevices]);

  // Handle test sound with animation
  const handleTestOutput = useCallback(async () => {
    setIsTestingOutput(true);
    setTimeout(() => setIsTestingOutput(false), 3000);
  }, []);

  const handleTestInput = useCallback(async () => {
    setIsTestingInput(true);
    setTimeout(() => setIsTestingInput(false), 3000);
  }, []);

  // Handle playback of recorded audio
  const handlePlayRecording = useCallback(async () => {
    try {
      // First copy the audio from /tmp to public so it can be served
      const response = await fetch('/api/audio/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-recording' })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play().catch(error => {
          console.error('Failed to play recording:', error);
          URL.revokeObjectURL(url);
        });
        // Cleanup after playback
        audio.addEventListener('ended', () => URL.revokeObjectURL(url));
      } else {
        console.error('Failed to get recording');
      }
    } catch (error) {
      console.error('Error playing recording:', error);
    }
  }, []);

  // Handle live microphone listening - continuous streaming
  const handleStartListening = useCallback(async () => {
    try {
      setIsListening(true);
      console.log('Starting continuous microphone listening...');

      // Create AbortController for user control
      const abortController = new AbortController();
      setListeningAbortController(abortController);

      // Create audio element that streams continuously from the endpoint
      const audio = new Audio();
      audio.src = '/api/audio/stream?type=live-mic';

      audio.onplay = () => {
        console.log('Continuous audio streaming started');
      };

      audio.onended = () => {
        console.log('Audio stream ended');
        setIsListening(false);
        setListeningAbortController(null);
      };

      audio.onerror = (e) => {
        console.error('Audio stream error:', e);
        setIsListening(false);
        setListeningAbortController(null);
      };

      // Start playing the stream
      await audio.play().catch(error => {
        console.error('Failed to start streaming:', error);
        setIsListening(false);
        abortController.abort();
        setListeningAbortController(null);
      });

      setListeningAudio(audio);
      console.log('Continuous listening active - click Stop Listening to end');
    } catch (error) {
      console.error('Error starting continuous listening:', error);
      setIsListening(false);
      setListeningAbortController(null);
    }
  }, []);

  // Handle stop listening
  const handleStopListening = useCallback(() => {
    try {
      console.log('Stopping continuous listening...');
      
      // Abort the fetch request
      if (listeningAbortController) {
        listeningAbortController.abort();
        setListeningAbortController(null);
      }
      
      // Stop any playing audio
      if (listeningAudio) {
        listeningAudio.pause();
        const url = listeningAudio.src;
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
        listeningAudio.src = '';
        setListeningAudio(null);
      }
      
      setIsListening(false);
      console.log('Stopped listening');
    } catch (error) {
      console.error('Error stopping listening:', error);
      setIsListening(false);
    }
  }, [listeningAudio, listeningAbortController]);

  // Handle volume changes with immediate form submission
  const handleOutputVolumeChange = useCallback((value: number) => {
    setOutputVolume(value);
    // Submit form immediately to change system volume
    const form = document.querySelector('form[data-volume-form="output"]') as HTMLFormElement;
    if (form) {
      const volumeInput = form.querySelector('input[name="volume"]') as HTMLInputElement;
      if (volumeInput) {
        volumeInput.value = value.toString();
        form.requestSubmit();
      }
    }
  }, []);

  const handleInputVolumeChange = useCallback((value: number) => {
    setInputVolume(value);
    // Submit form immediately to change system volume
    const form = document.querySelector('form[data-volume-form="input"]') as HTMLFormElement;
    if (form) {
      const volumeInput = form.querySelector('input[name="volume"]') as HTMLInputElement;
      if (volumeInput) {
        volumeInput.value = value.toString();
        form.requestSubmit();
      }
    }
  }, []);

  return (
    <div className="animate-fade-in-up">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
            {t("audio.title")}
          </h1>
          <p className="text-gray-700 dark:text-gray-300 mt-2">
            {t("audio.subtitle")}
          </p>
        </div>

        {/* Alert Messages */}
        {actionData?.success && (
          <Alert variant="default" className="mb-6 border-green-200 bg-green-50 dark:bg-green-900/20 animate-slide-in-right">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              {actionData.success && 'message' in actionData ? actionData.message : 'Success'}
            </AlertDescription>
          </Alert>
        )}

        {actionData && 'error' in actionData && (
          <Alert variant="destructive" className="mb-6 animate-slide-in-right">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{'error' in actionData ? actionData.error : 'An error occurred'}</AlertDescription>
          </Alert>
        )}

        {/* Masonry Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 lg:gap-6 auto-rows-auto">
          
          {/* Output Control Card */}
          <Card className={cn(
            "md:col-span-1 lg:col-span-1 hover:shadow-xl transition-all duration-300",
            isTestingOutput && "animate-pulse-glow"
          )}>
            <CardHeader className="pb-3 md:pb-4">
              <CardTitle className="flex items-center space-x-2">
                <Speaker className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span>{t("audio.audioOutput")}</span>
              </CardTitle>
              <CardDescription className="text-gray-500 dark:text-gray-400">
                {t("audio.audioOutputDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4">
              {/* Volume Control */}
              <div className="space-y-1 flex flex-col items-center">
                <div className="flex justify-center w-full min-h-max">
                  <Form method="post" data-volume-form="output" className="w-full flex justify-center">
                    <input type="hidden" name="intent" value="set-output-volume" />
                    <input type="hidden" name="volume" value={outputVolume} />
                    <CircularVolumeKnob
                      value={outputVolume}
                      onChange={handleOutputVolumeChange}
                      muted={outputMuted}
                      label={t("audio.outputVolume")}
                      size="large"
                      color="primary"
                      disabled={outputMuted}
                      className="max-w-xs"
                    />
                  </Form>
                </div>
              </div>

              {/* Audio Visualizer */}
              <div className="h-3 -mt-0.5">
                <AudioVisualizer
                  active={isTestingOutput}
                  type="wave"
                  height={8}
                  color="#3b82f6"
                  className="w-full"
                />
              </div>

              {/* Control Buttons */}
              <div className="grid grid-cols-1 gap-2 mt-2">
                <Form method="post">
                  <input type="hidden" name="intent" value="toggle-output-mute" />
                  <input type="hidden" name="muted" value={(!outputMuted).toString()} />
                  <Button
                    type="submit"
                    variant={outputMuted ? "destructive" : "outline"}
                    className="w-full"
                    onClick={() => setOutputMuted(!outputMuted)}
                  >
                    {outputMuted ? <VolumeX className="h-4 w-4 mr-2" /> : <Volume2 className="h-4 w-4 mr-2" />}
                    {outputMuted ? t("audio.unmute") : t("audio.mute")}
                  </Button>
                </Form>

                <Form method="post">
                  <input type="hidden" name="intent" value="test-output" />
                  <Button 
                    type="submit" 
                    variant="outline" 
                    className="w-full"
                    onClick={handleTestOutput}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {t("audio.testSound")}
                  </Button>
                </Form>
              </div>

              {/* Output Devices */}
              <div>
                <Label className="text-xs md:text-sm font-medium mb-1.5 md:mb-2 block">
                  {t("audio.availableOutputDevices")}
                </Label>
                <Form method="post" id="device-form-output" style={{ display: 'none' }}>
                  <input type="hidden" name="intent" value="set-output-device" id="device-id-output" />
                  <input type="hidden" name="deviceId" id="device-id-value-output" />
                </Form>
                <AudioDeviceGrid
                  devices={outputDevices}
                  selectedDevice={selectedOutputDevice ? outputDevices.find(d => d.id === selectedOutputDevice) : undefined}
                  onDeviceSelect={(device) => {
                    setSelectedOutputDevice(device.id);
                    // Submit the hidden form
                    const hiddenForm = document.getElementById('device-form-output') as HTMLFormElement;
                    const deviceIdInput = document.getElementById('device-id-value-output') as HTMLInputElement;
                    if (hiddenForm && deviceIdInput) {
                      deviceIdInput.value = device.id;
                      hiddenForm.requestSubmit();
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Audio Mode Selector Card */}
          <Card className="md:col-span-1 lg:col-span-1 hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-3 md:pb-4">
              <CardTitle className="flex items-center space-x-2">
                <Radio className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <span>Audio Output Mode</span>
              </CardTitle>
              <CardDescription className="text-gray-500 dark:text-gray-400">
                Choose where music plays
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Output Mode</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={audioMode === 'browser' ? 'default' : 'outline'}
                    className="w-full h-12 flex flex-col items-center justify-center space-y-1"
                    onClick={() => setAudioMode('browser')}
                  >
                    <Speaker className="h-4 w-4" />
                    <span className="text-xs">Browser</span>
                  </Button>
                  <Button
                    variant={audioMode === 'device' ? 'default' : 'outline'}
                    className="w-full h-12 flex flex-col items-center justify-center space-y-1"
                    onClick={() => setAudioMode('device')}
                  >
                    <Radio className="h-4 w-4" />
                    <span className="text-xs">Device</span>
                  </Button>
                </div>
              </div>
              
              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <div className="flex items-center space-x-2">
                  <Speaker className="h-3 w-3" />
                  <span><strong>Browser:</strong> Plays through your computer speakers</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Radio className="h-3 w-3" />
                  <span><strong>Device:</strong> Plays through Raspberry Pi audio jack</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Input Control Card */}
          <Card className={cn(
            "md:col-span-1 lg:col-span-1 hover:shadow-xl transition-all duration-300",
            isTestingInput && "animate-pulse-glow"
          )}>
            <CardHeader className="pb-3 md:pb-4">
              <CardTitle className="flex items-center space-x-2">
                <Mic className="h-5 w-5 text-green-600 dark:text-green-400" />
                <span>{t("audio.audioInput")}</span>
              </CardTitle>
              <CardDescription className="text-gray-500 dark:text-gray-400">
                {t("audio.audioInputDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4">
              {/* Volume Control */}
              <div className="space-y-1 flex flex-col items-center">
                <div className="flex justify-center w-full min-h-max">
                  <Form method="post" data-volume-form="input" className="w-full flex justify-center">
                    <input type="hidden" name="intent" value="set-input-volume" />
                    <input type="hidden" name="volume" value={inputVolume} />
                    <CircularVolumeKnob
                      value={inputVolume}
                      onChange={handleInputVolumeChange}
                      muted={inputMuted}
                      label={t("audio.inputVolume")}
                      size="large"
                      color="success"
                      disabled={inputMuted}
                      className="max-w-xs"
                    />
                  </Form>
                </div>
              </div>

              {/* Audio Visualizer */}
              <div className="h-3 -mt-0.5">
                <AudioVisualizer
                  active={isTestingInput}
                  type="bars"
                  height={8}
                  color="#10b981"
                  className="w-full"
                />
              </div>

              {/* Control Buttons */}
              <div className="grid grid-cols-1 gap-2 mt-2">
                <Form method="post">
                  <input type="hidden" name="intent" value="toggle-input-mute" />
                  <input type="hidden" name="muted" value={(!inputMuted).toString()} />
                  <Button
                    type="submit"
                    variant={inputMuted ? "destructive" : "outline"}
                    className="w-full"
                    onClick={() => setInputMuted(!inputMuted)}
                  >
                    {inputMuted ? <MicOff className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
                    {inputMuted ? t("audio.unmute") : t("audio.mute")}
                  </Button>
                </Form>

                <Form method="post">
                  <input type="hidden" name="intent" value="test-input" />
                  <Button 
                    type="submit" 
                    variant="outline" 
                    className="w-full"
                    onClick={handleTestInput}
                  >
                    <Radio className="h-4 w-4 mr-2" />
                    {t("audio.testRecording")}
                  </Button>
                </Form>
              </div>

              {/* Playback Controls */}
              <div className="grid grid-cols-1 gap-2 mt-2">
                <Form method="post">
                  <input type="hidden" name="intent" value="play-recorded-audio" />
                  <Button 
                    type="button"
                    variant="outline" 
                    className="w-full"
                    onClick={handlePlayRecording}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Play Recording
                  </Button>
                </Form>

                <Button 
                  type="button"
                  variant={isListening ? "destructive" : "outline"}
                  className="w-full"
                  onClick={isListening ? handleStopListening : handleStartListening}
                >
                  {isListening ? (
                    <>
                      <Square className="h-4 w-4 mr-2" />
                      Stop Listening
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4 mr-2" />
                      Listen Mode
                    </>
                  )}
                </Button>
              </div>

              {/* Input Devices */}
              <div>
                <Label className="text-xs md:text-sm font-medium mb-1.5 md:mb-2 block">
                  {t("audio.availableInputDevices")}
                </Label>
                <Form method="post" id="device-form-input" style={{ display: 'none' }}>
                  <input type="hidden" name="intent" value="set-input-device" id="device-id-input" />
                  <input type="hidden" name="deviceId" id="device-id-value-input" />
                </Form>
                <AudioDeviceGrid
                  devices={inputDevices}
                  selectedDevice={selectedInputDevice ? inputDevices.find(d => d.id === selectedInputDevice) : undefined}
                  onDeviceSelect={(device) => {
                    setSelectedInputDevice(device.id);
                    // Submit the hidden form
                    const hiddenForm = document.getElementById('device-form-input') as HTMLFormElement;
                    const deviceIdInput = document.getElementById('device-id-value-input') as HTMLInputElement;
                    if (hiddenForm && deviceIdInput) {
                      deviceIdInput.value = device.id;
                      hiddenForm.requestSubmit();
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* System Information Card - Spans both columns */}
          <Card className="md:col-span-2 lg:col-span-3 lg:row-start-2 hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/10 dark:to-green-900/10">
            <CardHeader className="pb-3 md:pb-4">
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <span>{t("audio.audioSystemInfo")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3 lg:gap-4">
                <div className="text-center p-2 md:p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {devices.playback.length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {t("audio.outputDevices")}
                  </div>
                </div>
                
                <div className="text-center p-2 md:p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {devices.capture.length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {t("audio.inputDevices")}
                  </div>
                </div>
                
                <div className="text-center p-2 md:p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                  <div className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                    {settings.outputDevice}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {t("audio.currentOutput")}
                  </div>
                </div>
                
                <div className="text-center p-2 md:p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                  <div className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                    {settings.inputDevice}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {t("audio.currentInput")}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Helper function for conditional classes
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}