import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useFetcher } from "@remix-run/react";
import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription } from "~/components/ui/alert";
import {
  getAudioDevices,
  getAudioSettings,
  setVolume,
  setMute,
  playTestSound,
  setDefaultOutputDevice,
  setDefaultInputDevice
} from "~/services/audio.service.server";
import {
  scanBluetoothDevices,
  getPairedDevices,
  pairBluetoothDevice,
  connectBluetoothDevice,
  forgetBluetoothDevice
} from "~/services/bluetooth.service.server";
import {
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Play,
  CheckCircle2,
  XCircle,
  Speaker,
  Activity,
  Square,
  Bluetooth,
  RefreshCw,
  Headphones,
  HelpCircle,
  Radio
} from "lucide-react";

// Import audio components
import { CircularVolumeKnob } from "~/components/audio/CircularVolumeKnob";
import { AudioVisualizer } from "~/components/audio/AudioVisualizer";
import { AudioDeviceGrid } from "~/components/audio/AudioDeviceCard";
import { useAudioMode } from "~/contexts/AudioModeContext";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const scan = url.searchParams.get("scan");

  // Get audio devices and settings
  const audioDevices = await getAudioDevices();
  const audioSettings = await getAudioSettings();

  // Get paired bluetooth devices (always fast)
  const pairedDevices = await getPairedDevices();

  // Only scan for available bluetooth devices if explicitly requested
  let availableDevices = null;
  if (scan === "true") {
    availableDevices = await scanBluetoothDevices();
  }

  return json({
    audioDevices,
    audioSettings,
    pairedDevices,
    availableDevices
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  // Audio actions
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

  // Bluetooth actions
  if (intent === "pair") {
    const address = formData.get("address") as string;
    const result = await pairBluetoothDevice(address);
    if (result.success) {
      return json({ success: true, message: "Device paired successfully" });
    }
    return json({ success: false, error: "Failed to pair device" }, { status: 400 });
  }

  if (intent === "connect") {
    const address = formData.get("address") as string;
    const result = await connectBluetoothDevice(address);
    if (result.success) {
      return json({ success: true, message: "Device connected successfully" });
    }
    return json({ success: false, error: "Failed to connect device" }, { status: 400 });
  }

  if (intent === "forget") {
    const address = formData.get("address") as string;
    const result = await forgetBluetoothDevice(address);
    if (result.success) {
      return json({ success: true, message: "Device forgotten successfully" });
    }
    return json({ success: false, error: "Failed to forget device" }, { status: 400 });
  }

  return json({ error: "Invalid action", success: false }, { status: 400 });
}

export default function AudioBluetoothPage() {
  const { audioDevices, audioSettings, pairedDevices, availableDevices: initialAvailable } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const fetcher = useFetcher<typeof loader>();
  const { t } = useTranslation();
  const { audioMode, setAudioMode } = useAudioMode();

  // Audio state
  const [outputVolume, setOutputVolume] = useState(audioSettings.outputVolume);
  const [inputVolume, setInputVolume] = useState(audioSettings.inputVolume);
  const [outputMuted, setOutputMuted] = useState(audioSettings.outputMuted);
  const [inputMuted, setInputMuted] = useState(audioSettings.inputMuted);
  const [isTestingOutput, setIsTestingOutput] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [volume, setVolume] = useState(0);

  // WebSocket and Web Audio API refs
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const nextPlayTimeRef = useRef(0);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isProcessingQueueRef = useRef(false);

  // Prepare device data
  const outputDevices = audioDevices.playback.map(device => ({
    ...device,
    type: 'playback' as const
  }));

  const inputDevices = audioDevices.capture.map(device => ({
    ...device,
    type: 'capture' as const
  }));

  // Device selection state
  const [selectedOutputDevice, setSelectedOutputDevice] = useState<string | null>(() => {
    const defaultDevice = outputDevices.find(d => d.isDefault);
    if (defaultDevice) return defaultDevice.id;
    const savedDevice = typeof window !== 'undefined' ? localStorage.getItem('selectedOutputDevice') : null;
    if (savedDevice && outputDevices.some(d => d.id === savedDevice)) {
      return savedDevice;
    }
    return outputDevices.length > 0 ? outputDevices[0].id : null;
  });

  const [selectedInputDevice, setSelectedInputDevice] = useState<string | null>(() => {
    const defaultDevice = inputDevices.find(d => d.isDefault);
    if (defaultDevice) return defaultDevice.id;
    const savedDevice = typeof window !== 'undefined' ? localStorage.getItem('selectedInputDevice') : null;
    if (savedDevice && inputDevices.some(d => d.id === savedDevice)) {
      return savedDevice;
    }
    return inputDevices.length > 0 ? inputDevices[0].id : null;
  });

  // Bluetooth state
  useEffect(() => {
    if (initialAvailable === null && !fetcher.data && fetcher.state === "idle") {
      fetcher.load("?scan=true");
    }
  }, []);

  const availableDevices = fetcher.data?.availableDevices ?? initialAvailable ?? [];
  const isScanning = fetcher.state === "loading" || (initialAvailable === null && !fetcher.data);

  // Save selected devices to localStorage
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

  // Sync states from action data
  useEffect(() => {
    if (actionData?.success && 'message' in actionData) {
      if (actionData.message?.includes('Output device')) {
        const defaultOutput = outputDevices.find(d => d.isDefault);
        if (defaultOutput) setSelectedOutputDevice(defaultOutput.id);
      } else if (actionData.message?.includes('Input device')) {
        const defaultInput = inputDevices.find(d => d.isDefault);
        if (defaultInput) setSelectedInputDevice(defaultInput.id);
      } else if (actionData.message?.includes('Output muted')) {
        setOutputMuted(true);
      } else if (actionData.message?.includes('Output unmuted')) {
        setOutputMuted(false);
      } else if (actionData.message?.includes('Input muted')) {
        setInputMuted(true);
      } else if (actionData.message?.includes('Input unmuted')) {
        setInputMuted(false);
      }
    }
  }, [actionData, outputDevices, inputDevices]);

  // Audio handlers
  const handleTestOutput = useCallback(async () => {
    setIsTestingOutput(true);
    setTimeout(() => setIsTestingOutput(false), 3000);
  }, []);

  const queueAudioChunk = useCallback((arrayBuffer: ArrayBuffer) => {
    if (!audioContextRef.current) return;
    audioQueueRef.current.push(arrayBuffer);
    if (!isProcessingQueueRef.current) {
      processAudioQueue();
    }
  }, []);

  const processAudioQueue = useCallback(async () => {
    if (isProcessingQueueRef.current || audioQueueRef.current.length === 0) return;
    isProcessingQueueRef.current = true;
    while (audioQueueRef.current.length > 0 && audioContextRef.current) {
      const arrayBuffer = audioQueueRef.current.shift()!;
      await playAudioChunk(arrayBuffer);
    }
    isProcessingQueueRef.current = false;
  }, []);

  const playAudioChunk = useCallback(async (arrayBuffer: ArrayBuffer) => {
    if (!audioContextRef.current || !gainNodeRef.current) return;

    const int16Array = new Int16Array(arrayBuffer);
    const float32Array = new Float32Array(int16Array.length);

    let sum = 0;
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
      sum += Math.abs(float32Array[i]);
    }

    setVolume((sum / int16Array.length) * 100);

    const audioBuffer = audioContextRef.current.createBuffer(1, float32Array.length, 16000);
    audioBuffer.getChannelData(0).set(float32Array);

    const currentTime = audioContextRef.current.currentTime;
    if (nextPlayTimeRef.current < currentTime) {
      nextPlayTimeRef.current = currentTime;
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(gainNodeRef.current);
    source.start(nextPlayTimeRef.current);

    nextPlayTimeRef.current += audioBuffer.duration;
  }, []);

  const handleStartListening = useCallback(async () => {
    try {
      console.log('Starting WebSocket microphone listening...');

      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000
      });

      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.gain.value = 2.0;
      gainNodeRef.current.connect(audioContextRef.current.destination);

      nextPlayTimeRef.current = audioContextRef.current.currentTime;
      audioQueueRef.current = [];
      isProcessingQueueRef.current = false;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/microphone`;

      wsRef.current = new WebSocket(wsUrl);
      wsRef.current.binaryType = 'arraybuffer';

      wsRef.current.onopen = () => {
        setIsListening(true);
        console.log('WebSocket microphone connected');
      };

      wsRef.current.onmessage = (event) => {
        queueAudioChunk(event.data);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        handleStopListening();
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket closed');
        handleStopListening();
      };
    } catch (error) {
      console.error('Error starting microphone listening:', error);
      handleStopListening();
    }
  }, [queueAudioChunk]);

  const handleStopListening = useCallback(() => {
    try {
      console.log('Stopping microphone listening...');
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      setIsListening(false);
      setVolume(0);
      nextPlayTimeRef.current = 0;
      audioQueueRef.current = [];
      isProcessingQueueRef.current = false;
      console.log('Stopped listening');
    } catch (error) {
      console.error('Error stopping listening:', error);
      setIsListening(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      handleStopListening();
    };
  }, [handleStopListening]);

  const handleOutputVolumeChange = useCallback((value: number) => {
    setOutputVolume(value);
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
    const form = document.querySelector('form[data-volume-form="input"]') as HTMLFormElement;
    if (form) {
      const volumeInput = form.querySelector('input[name="volume"]') as HTMLInputElement;
      if (volumeInput) {
        volumeInput.value = value.toString();
        form.requestSubmit();
      }
    }
  }, []);

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'headphones':
        return <Headphones className="h-5 w-5" />;
      case 'speaker':
        return <Speaker className="h-5 w-5" />;
      default:
        return <HelpCircle className="h-5 w-5" />;
    }
  };

  return (
    <div className="animate-fade-in-up">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
            Audio & Bluetooth
          </h1>
          <p className="text-gray-700 dark:text-gray-300 mt-2">
            Manage audio settings and bluetooth devices
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

        {/* Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 lg:gap-6">

          {/* Output Control Card */}
          <Card className={cn(
            "hover:shadow-xl transition-all duration-300",
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

              <div className="h-3 -mt-0.5">
                <AudioVisualizer
                  active={isTestingOutput}
                  type="wave"
                  height={8}
                  color="#3b82f6"
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-1 gap-2 mt-2">
                <Form method="post">
                  <input type="hidden" name="intent" value="toggle-output-mute" />
                  <input type="hidden" name="muted" value={(!outputMuted).toString()} />
                  <Button
                    type="submit"
                    variant={outputMuted ? "destructive" : "outline"}
                    className="w-full"
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

              <div>
                <Label className="text-xs md:text-sm font-medium mb-1.5 md:mb-2 block">
                  {t("audio.availableOutputDevices")}
                </Label>
                <Form method="post" id="device-form-output" style={{ display: 'none' }}>
                  <input type="hidden" name="intent" value="set-output-device" />
                  <input type="hidden" name="deviceId" id="device-id-value-output" />
                </Form>
                <AudioDeviceGrid
                  devices={outputDevices}
                  selectedDevice={selectedOutputDevice ? outputDevices.find(d => d.id === selectedOutputDevice) : undefined}
                  onDeviceSelect={(device) => {
                    setSelectedOutputDevice(device.id);
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

          {/* Audio Mode Card */}
          <Card className="hover:shadow-xl transition-all duration-300">
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
          <Card className="hover:shadow-xl transition-all duration-300">
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

              <div className="h-3 -mt-0.5">
                <AudioVisualizer
                  active={isListening}
                  type="bars"
                  height={8}
                  color="#10b981"
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-1 gap-2 mt-2">
                <Form method="post">
                  <input type="hidden" name="intent" value="toggle-input-mute" />
                  <input type="hidden" name="muted" value={(!inputMuted).toString()} />
                  <Button
                    type="submit"
                    variant={inputMuted ? "destructive" : "outline"}
                    className="w-full"
                  >
                    {inputMuted ? <MicOff className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
                    {inputMuted ? t("audio.unmute") : t("audio.mute")}
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

              {isListening && (
                <div className="mt-2">
                  <Label className="text-xs font-medium mb-1 block text-gray-600 dark:text-gray-400">
                    Live Audio Level
                  </Label>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-100"
                      style={{ width: `${Math.min(volume * 5, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              <div>
                <Label className="text-xs md:text-sm font-medium mb-1.5 md:mb-2 block">
                  {t("audio.availableInputDevices")}
                </Label>
                <Form method="post" id="device-form-input" style={{ display: 'none' }}>
                  <input type="hidden" name="intent" value="set-input-device" />
                  <input type="hidden" name="deviceId" id="device-id-value-input" />
                </Form>
                <AudioDeviceGrid
                  devices={inputDevices}
                  selectedDevice={selectedInputDevice ? inputDevices.find(d => d.id === selectedInputDevice) : undefined}
                  onDeviceSelect={(device) => {
                    setSelectedInputDevice(device.id);
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

          {/* Paired Bluetooth Devices */}
          <Card className="md:col-span-2 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bluetooth className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span>{t("bluetooth.pairedDevices")}</span>
              </CardTitle>
              <CardDescription>{t("bluetooth.pairedDevices")}</CardDescription>
            </CardHeader>
            <CardContent>
              {pairedDevices.length === 0 ? (
                <div className="text-center py-8 text-gray-700 dark:text-gray-400">
                  <Bluetooth className="h-12 w-12 mx-auto mb-2 text-gray-600 dark:text-gray-400" />
                  <p>{t("bluetooth.noDevices")}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pairedDevices.map((device) => (
                    <div
                      key={device.address}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        {getDeviceIcon(device.type)}
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{device.name}</p>
                          <p className="text-sm text-gray-700 dark:text-gray-400">{device.address}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {device.connected ? (
                          <Badge className="bg-green-900 text-green-300">
                            <span className="status-indicator bg-green-500 mr-1"></span>
                            {t("bluetooth.connected")}
                          </Badge>
                        ) : (
                          <Form method="post">
                            <input type="hidden" name="intent" value="connect" />
                            <input type="hidden" name="address" value={device.address} />
                            <Button type="submit" size="sm">{t("bluetooth.connect")}</Button>
                          </Form>
                        )}
                        <Form method="post">
                          <input type="hidden" name="intent" value="forget" />
                          <input type="hidden" name="address" value={device.address} />
                          <Button type="submit" variant="ghost" size="sm" className="text-red-600">
                            {t("bluetooth.unpair")}
                          </Button>
                        </Form>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Available Bluetooth Devices */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Bluetooth className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span>{t("bluetooth.availableDevices")}</span>
                  </CardTitle>
                  <CardDescription>{t("bluetooth.availableDevices")}</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetcher.load("?scan=true")}
                  disabled={isScanning}
                  className="touch-manipulation"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isScanning ? 'animate-spin' : ''}`} />
                  {t("common.search")}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isScanning ? (
                <div className="text-center py-8 text-gray-700 dark:text-gray-400">
                  <RefreshCw className="h-12 w-12 mx-auto mb-2 animate-spin text-gray-600 dark:text-gray-400" />
                  <p>{t("bluetooth.scanning")}</p>
                  <p className="text-sm text-gray-700 dark:text-gray-400">{t("common.loading")}</p>
                </div>
              ) : availableDevices.length === 0 ? (
                <div className="text-center py-8 text-gray-700 dark:text-gray-400">
                  <Bluetooth className="h-12 w-12 mx-auto mb-2 text-gray-600 dark:text-gray-400" />
                  <p>{t("bluetooth.noDevices")}</p>
                  <p className="text-sm text-gray-700 dark:text-gray-400">{t("common.search")}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {availableDevices
                    .filter((device) => !device.paired)
                    .map((device) => (
                      <div
                        key={device.address}
                        className="flex items-center justify-between p-4 border rounded-lg hover:border-primary-500"
                      >
                        <div className="flex items-center space-x-3">
                          {getDeviceIcon(device.type)}
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{device.name}</p>
                            <p className="text-sm text-gray-700 dark:text-gray-400">{device.address}</p>
                          </div>
                        </div>
                        <Form method="post">
                          <input type="hidden" name="intent" value="pair" />
                          <input type="hidden" name="address" value={device.address} />
                          <Button type="submit" size="sm">{t("bluetooth.pair")}</Button>
                        </Form>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Information */}
          <Card className="md:col-span-2 lg:col-span-3 hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/10 dark:to-green-900/10">
            <CardHeader className="pb-3 md:pb-4">
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <span>System Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-3 lg:gap-4">
                <div className="text-center p-2 md:p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {audioDevices.playback.length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {t("audio.outputDevices")}
                  </div>
                </div>

                <div className="text-center p-2 md:p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {audioDevices.capture.length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {t("audio.inputDevices")}
                  </div>
                </div>

                <div className="text-center p-2 md:p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {pairedDevices.length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Bluetooth Devices
                  </div>
                </div>

                <div className="text-center p-2 md:p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                  <div className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                    {audioSettings.outputDevice}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {t("audio.currentOutput")}
                  </div>
                </div>

                <div className="text-center p-2 md:p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                  <div className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                    {audioSettings.inputDevice}
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

// Helper function
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
