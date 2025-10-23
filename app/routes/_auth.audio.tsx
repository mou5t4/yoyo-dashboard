import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { getAudioDevices, getAudioSettings, setVolume, setMute, playTestSound, recordTestAudio, setDefaultOutputDevice, setDefaultInputDevice, setAudioMode } from "~/services/audio.service.server";
import { Volume2, VolumeX, Mic, MicOff, Play, Radio, CheckCircle2, XCircle, Speaker, Activity } from "lucide-react";

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
  const [selectedOutputDevice, setSelectedOutputDevice] = useState<string | null>(null);
  const [selectedInputDevice, setSelectedInputDevice] = useState<string | null>(null);
  
  const { t } = useTranslation();
  const { audioMode, setAudioMode } = useAudioMode();

  // Handle test sound with animation
  const handleTestOutput = useCallback(async () => {
    setIsTestingOutput(true);
    setTimeout(() => setIsTestingOutput(false), 3000);
  }, []);

  const handleTestInput = useCallback(async () => {
    setIsTestingInput(true);
    setTimeout(() => setIsTestingInput(false), 3000);
  }, []);

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

  // Prepare device data for new components
  const outputDevices = devices.playback.map(device => ({
    ...device,
    type: 'playback' as const
  }));

  const inputDevices = devices.capture.map(device => ({
    ...device,
    type: 'capture' as const
  }));

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-1.5 auto-rows-auto">
          
          {/* Output Control Card */}
          <Card className={cn(
            "md:col-span-1 lg:col-span-1 hover:shadow-xl transition-all duration-300",
            isTestingOutput && "animate-pulse-glow"
          )}>
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center space-x-2">
                <Speaker className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span>{t("audio.audioOutput")}</span>
              </CardTitle>
              <CardDescription className="text-gray-500 dark:text-gray-400">
                {t("audio.audioOutputDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-0.5 md:space-y-0.125">
              {/* Volume Control */}
              <div className="space-y-0">
                <div className="flex justify-center py-0 -my-1">
                  <Form method="post" data-volume-form="output">
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
                    />
                  </Form>
                </div>
              </div>

              {/* Audio Visualizer */}
              <div className="h-2 -mt-2">
                <AudioVisualizer
                  active={isTestingOutput}
                  type="wave"
                  height={8}
                  color="#3b82f6"
                  className="w-full"
                />
              </div>

              {/* Control Buttons */}
              <div className="flex space-x-0.5 mt-0">
                <Form method="post" className="flex-1">
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

                <Form method="post" className="flex-1">
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
                <Label className="text-sm font-medium mb-0.25 block">
                  {t("audio.availableOutputDevices")}
                </Label>
                <AudioDeviceGrid
                  devices={outputDevices}
                  selectedDevice={selectedOutputDevice ? outputDevices.find(d => d.id === selectedOutputDevice) : undefined}
                  onDeviceSelect={(device) => {
                    setSelectedOutputDevice(device.id);
                    // Submit form to change the default device
                    const form = document.createElement('form');
                    form.method = 'post';
                    form.innerHTML = `
                      <input type="hidden" name="intent" value="set-output-device" />
                      <input type="hidden" name="deviceId" value="${device.id}" />
                    `;
                    document.body.appendChild(form);
                    form.submit();
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Audio Mode Selector Card */}
          <Card className="md:col-span-1 lg:col-span-1 hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-1">
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
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center space-x-2">
                <Mic className="h-5 w-5 text-green-600 dark:text-green-400" />
                <span>{t("audio.audioInput")}</span>
              </CardTitle>
              <CardDescription className="text-gray-500 dark:text-gray-400">
                {t("audio.audioInputDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-0.5 md:space-y-0.125">
              {/* Volume Control */}
              <div className="space-y-0">
                <div className="flex justify-center py-0 -my-1">
                  <Form method="post" data-volume-form="input">
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
                    />
                  </Form>
                </div>
              </div>

              {/* Audio Visualizer */}
              <div className="h-2 -mt-2">
                <AudioVisualizer
                  active={isTestingInput}
                  type="bars"
                  height={8}
                  color="#10b981"
                  className="w-full"
                />
              </div>

              {/* Control Buttons */}
              <div className="flex space-x-0.5 mt-0">
                <Form method="post" className="flex-1">
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

                <Form method="post" className="flex-1">
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

              {/* Input Devices */}
              <div>
                <Label className="text-sm font-medium mb-0.25 block">
                  {t("audio.availableInputDevices")}
                </Label>
                <AudioDeviceGrid
                  devices={inputDevices}
                  selectedDevice={selectedInputDevice ? inputDevices.find(d => d.id === selectedInputDevice) : undefined}
                  onDeviceSelect={(device) => {
                    setSelectedInputDevice(device.id);
                    // Submit form to change the default device
                    const form = document.createElement('form');
                    form.method = 'post';
                    form.innerHTML = `
                      <input type="hidden" name="intent" value="set-input-device" />
                      <input type="hidden" name="deviceId" value="${device.id}" />
                    `;
                    document.body.appendChild(form);
                    form.submit();
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* System Information Card - Spans both columns */}
          <Card className="md:col-span-2 lg:col-span-3 lg:row-start-2 hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/10 dark:to-green-900/10">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <span>{t("audio.audioSystemInfo")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
                <div className="text-center p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {devices.playback.length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {t("audio.outputDevices")}
                  </div>
                </div>
                
                <div className="text-center p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {devices.capture.length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {t("audio.inputDevices")}
                  </div>
                </div>
                
                <div className="text-center p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                  <div className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                    {settings.outputDevice}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {t("audio.currentOutput")}
                  </div>
                </div>
                
                <div className="text-center p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
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