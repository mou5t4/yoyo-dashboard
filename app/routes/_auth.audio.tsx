import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { getAudioDevices, getAudioSettings, setVolume, setMute, playTestSound, recordTestAudio } from "~/services/audio.service.server";
import { Volume2, VolumeX, Mic, MicOff, Play, Radio, CheckCircle2, XCircle, Speaker } from "lucide-react";

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

  return json({ error: "Invalid action", success: false }, { status: 400 });
}


export default function AudioPage() {
  const { devices, settings } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [outputVolume, setOutputVolume] = useState(settings.outputVolume);
  const [inputVolume, setInputVolume] = useState(settings.inputVolume);
  const [outputMuted, setOutputMuted] = useState(settings.outputMuted);
  const [inputMuted, setInputMuted] = useState(settings.inputMuted);
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white high-contrast-white">{t("audio.title")}</h1>
        <p className="text-white/95 mt-1 improved-contrast-text">{t("audio.subtitle")}</p>
      </div>

      {actionData?.success && (
        <Alert variant="default" className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {actionData.message}
          </AlertDescription>
        </Alert>
      )}

      {actionData?.error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{actionData.error}</AlertDescription>
        </Alert>
      )}

      {/* Audio Output */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Speaker className="h-5 w-5" />
            <span>{t("audio.audioOutput")}</span>
          </CardTitle>
          <CardDescription className="text-gray-400">{t("audio.audioOutputDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Output Devices */}
          <div>
            <Label className="text-sm font-medium mb-2 block">{t("audio.availableOutputDevices")}</Label>
            <div className="space-y-2">
              {devices.playback.length === 0 ? (
                <p className="text-sm text-white/90 improved-contrast-text">{t("audio.noInputDevices")}</p>
              ) : (
                devices.playback.map((device) => (
                  <div
                    key={device.id}
                    className="flex items-center space-x-3 p-3 border rounded-lg"
                  >
                    <Volume2 className="h-4 w-4 text-white/90" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{device.name}</p>
                      <p className="text-xs text-white/90 improved-contrast-text">{device.id}</p>
                    </div>
                    {device.isDefault && (
                      <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded">
                        {t("common.select")}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Volume Control */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">{t("audio.outputVolume")}</Label>
              <span className="text-2xl font-bold text-primary-600">{outputVolume}%</span>
            </div>

            <Form method="post" onChange={(e) => e.currentTarget.requestSubmit()}>
              <input type="hidden" name="intent" value="set-output-volume" />
              <input type="hidden" name="volume" value={outputVolume} />
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={outputVolume}
                onChange={(e) => setOutputVolume(Number(e.target.value))}
                disabled={outputMuted}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
              />
            </Form>

            <div className="flex items-center space-x-4">
              <Form method="post" className="flex-1">
                <input type="hidden" name="intent" value="toggle-output-mute" />
                <input type="hidden" name="muted" value={(!outputMuted).toString()} />
                <Button
                  type="submit"
                  variant={outputMuted ? "destructive" : "outline"}
                  className="w-full touch-manipulation"
                  onClick={() => setOutputMuted(!outputMuted)}
                >
                  {outputMuted ? <VolumeX className="h-4 w-4 mr-2" /> : <Volume2 className="h-4 w-4 mr-2" />}
                  {outputMuted ? t("audio.unmute") : t("audio.mute")}
                </Button>
              </Form>

              <Form method="post" className="flex-1">
                <input type="hidden" name="intent" value="test-output" />
                <Button type="submit" variant="outline" className="w-full touch-manipulation">
                  <Play className="h-4 w-4 mr-2" />
                  {t("audio.testSound")}
                </Button>
              </Form>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audio Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Mic className="h-5 w-5" />
            <span>{t("audio.audioInput")}</span>
          </CardTitle>
          <CardDescription className="text-gray-400">{t("audio.audioInputDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Input Devices */}
          <div>
            <Label className="text-sm font-medium mb-2 block">{t("audio.availableInputDevices")}</Label>
            <div className="space-y-2">
              {devices.capture.length === 0 ? (
                <p className="text-sm text-white/90 improved-contrast-text">{t("audio.noInputDevices")}</p>
              ) : (
                devices.capture.map((device) => (
                  <div
                    key={device.id}
                    className="flex items-center space-x-3 p-3 border rounded-lg"
                  >
                    <Mic className="h-4 w-4 text-white/90" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{device.name}</p>
                      <p className="text-xs text-white/90 improved-contrast-text">{device.id}</p>
                    </div>
                    {device.isDefault && (
                      <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded">
                        {t("common.select")}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Volume Control */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">{t("audio.inputVolume")}</Label>
              <span className="text-2xl font-bold text-primary-600">{inputVolume}%</span>
            </div>

            <Form method="post" onChange={(e) => e.currentTarget.requestSubmit()}>
              <input type="hidden" name="intent" value="set-input-volume" />
              <input type="hidden" name="volume" value={inputVolume} />
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={inputVolume}
                onChange={(e) => setInputVolume(Number(e.target.value))}
                disabled={inputMuted}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
              />
            </Form>

            <div className="flex items-center space-x-4">
              <Form method="post" className="flex-1">
                <input type="hidden" name="intent" value="toggle-input-mute" />
                <input type="hidden" name="muted" value={(!inputMuted).toString()} />
                <Button
                  type="submit"
                  variant={inputMuted ? "destructive" : "outline"}
                  className="w-full touch-manipulation"
                  onClick={() => setInputMuted(!inputMuted)}
                >
                  {inputMuted ? <MicOff className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
                  {inputMuted ? t("audio.unmute") : t("audio.mute")}
                </Button>
              </Form>

              <Form method="post" className="flex-1">
                <input type="hidden" name="intent" value="test-input" />
                <Button type="submit" variant="outline" className="w-full touch-manipulation">
                  <Radio className="h-4 w-4 mr-2" />
                  {t("audio.testRecording")}
                </Button>
              </Form>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audio Information */}
      <Card>
        <CardHeader>
          <CardTitle>{t("audio.audioSystemInfo")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-white/90 improved-contrast-text">{t("audio.outputDevices")}:</span>
              <span className="font-medium">{devices.playback.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/90 improved-contrast-text">{t("audio.inputDevices")}:</span>
              <span className="font-medium">{devices.capture.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/90 improved-contrast-text">{t("audio.currentOutput")}:</span>
              <span className="font-medium">{settings.outputDevice}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/90 improved-contrast-text">{t("audio.currentInput")}:</span>
              <span className="font-medium">{settings.inputDevice}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
