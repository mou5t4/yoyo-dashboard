import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { getAudioDevices } from "~/services/audio.service.server";
import {
  playAudioOnDevice,
  pauseDeviceAudio,
  resumeDeviceAudio,
  stopDeviceAudio,
  getPlaybackState
} from "~/services/audio-player.server";
import fs from "fs";
import { promisify } from "util";
import { exec } from "child_process";
import { logger } from "~/lib/logger.server";

const execAsync = promisify(exec);

export async function loader({ request }: LoaderFunctionArgs) {
  // This loader is not used for streaming, only the action handles it
  return json({ error: "Invalid request" }, { status: 400 });
}

export async function action({ request }: ActionFunctionArgs) {
  // Handle JSON POST requests
  if (request.method === "POST" && request.headers.get("Content-Type")?.includes("application/json")) {
    const body = await request.json();
    const action = body.action;

    // Get recorded audio file
    if (action === "get-recording") {
      try {
        const filePath = "/tmp/audio_test.wav";
        if (!fs.existsSync(filePath)) {
          return json({ error: "No recorded audio available" }, { status: 404 });
        }

        const audioBuffer = fs.readFileSync(filePath);
        return new Response(audioBuffer, {
          headers: {
            "Content-Type": "audio/wav",
            "Content-Length": audioBuffer.length.toString(),
          },
        });
      } catch (error) {
        console.error("Failed to get recording", error);
        return json({ error: "Failed to get recording" }, { status: 500 });
      }
    }

    // Listen to microphone - capture 5 seconds of audio
    if (action === "listen-mode") {
      try {
        const tempFile = `/tmp/mic_listen_${Date.now()}.wav`;
        let captureSuccess = false;
        let lastError: any = null;

        // Get available capture devices
        const { capture: captureDevices } = await getAudioDevices();
        logger.info(`Available capture devices: ${JSON.stringify(captureDevices)}`);

        // Try each capture device
        for (const device of captureDevices) {
          try {
            logger.info(`Attempting to record from device: ${device.id} (${device.name})`);
            // Try multiple format options - S16_LE is more compatible with USB devices
            const formatOptions = ['S16_LE', 'U16_LE', 'cd'];
            let recordSuccess = false;
            
            for (const format of formatOptions) {
              try {
                logger.info(`  Trying format: ${format}`);
                await execAsync(`timeout 5 arecord -D "${device.id}" -f ${format} -d 5 "${tempFile}" 2>/dev/null`);
                recordSuccess = true;
                logger.info(`  Successfully recorded with format: ${format}`);
                break;
              } catch (formatError) {
                logger.debug(`  Format ${format} failed, trying next...`);
              }
            }
            
            if (recordSuccess) {
              captureSuccess = true;
              logger.info(`Successfully recorded from device: ${device.id}`);
              break;
            }
          } catch (error) {
            logger.warn(`Failed to record from device ${device.id}:`, error);
            lastError = error;
          }
        }

        // If device-specific recording failed, try default device
        if (!captureSuccess) {
          try {
            logger.info("Attempting to record from default device");
            const formatOptions = ['S16_LE', 'U16_LE', 'cd'];
            
            for (const format of formatOptions) {
              try {
                logger.info(`  Trying format: ${format}`);
                await execAsync(`timeout 5 arecord -f ${format} -d 5 "${tempFile}" 2>/dev/null`);
                captureSuccess = true;
                logger.info(`Successfully recorded from default device with format: ${format}`);
                break;
              } catch (formatError) {
                logger.debug(`  Format ${format} failed, trying next...`);
              }
            }
          } catch (error) {
            logger.error("Failed to record from default device:", error);
            lastError = error;
          }
        }

        // Check if recording was successful
        if (!captureSuccess) {
          const errorMessage = lastError?.message || "No audio device available";
          logger.error(`Audio capture failed - ${errorMessage}`);
          logger.error(`Available devices: ${captureDevices.map(d => d.id).join(", ") || "none"}`);
          return json(
            { 
              error: "Failed to capture audio", 
              details: errorMessage,
              availableDevices: captureDevices.map(d => ({ id: d.id, name: d.name }))
            }, 
            { status: 500 }
          );
        }
        
        // Check if file exists and has data
        if (!fs.existsSync(tempFile)) {
          logger.error("No audio file created after successful arecord command");
          return json({ error: "No audio captured" }, { status: 500 });
        }
        
        const stats = fs.statSync(tempFile);
        if (stats.size < 100) {
          fs.unlinkSync(tempFile);
          logger.warn(`Audio file too small: ${stats.size} bytes`);
          return json({ error: "No audio captured" }, { status: 500 });
        }
        
        const audioBuffer = fs.readFileSync(tempFile);
        fs.unlinkSync(tempFile);
        
        return new Response(audioBuffer, {
          headers: {
            "Content-Type": "audio/wav",
            "Content-Length": audioBuffer.length.toString(),
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        });
      } catch (error: any) {
        logger.error("Failed to capture microphone audio:", error);
        return json({ error: "Failed to capture audio", details: error.message }, { status: 500 });
      }
    }

    // Handle pause action
    if (action === "pause") {
      const result = await pauseDeviceAudio();
      return json(result);
    }

    // Handle resume action
    if (action === "resume") {
      const result = await resumeDeviceAudio();
      return json(result);
    }

    // Handle stop action
    if (action === "stop") {
      const result = await stopDeviceAudio();
      return json(result);
    }

    // Handle playback state query
    if (action === "get-state") {
      const state = await getPlaybackState();
      return json({ success: true, state });
    }

    // Handle default play action
    const { filePath, seekPosition } = body;

    // If no filePath, treat it as a stop request
    if (!filePath) {
      const result = await stopDeviceAudio();
      return json(result);
    }

    const result = await playAudioOnDevice(filePath, seekPosition);
    return json(result);
  }

  // Handle form data requests
  const formData = await request.formData();
  const act = formData.get("action");

  if (act === "play") {
    const filePath = formData.get("filePath") as string;
    
    if (!filePath) {
      return json({ error: "File path is required", success: false }, { status: 400 });
    }

    const result = await playAudioOnDevice(filePath);
    return json(result);
  }

  if (act === "stop") {
    const result = await stopDeviceAudio();
    return json(result);
  }

  return json({ error: "Invalid action", success: false }, { status: 400 });
}
