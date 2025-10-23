import { LoaderFunctionArgs } from "@remix-run/node";
import { spawn } from "child_process";
import { getAudioDevices } from "~/services/audio.service.server";
import { logger } from "~/lib/logger.server";

// Create WAV header for PCM audio
function createWavHeader(sampleRate: number = 44100, numChannels: number = 1, bitsPerSample: number = 16): Buffer {
  const header = Buffer.alloc(44);
  
  // "RIFF" chunk descriptor
  header.write('RIFF', 0);
  header.writeUInt32LE(36, 4); // File size - 8 (will be updated later)
  header.write('WAVE', 8);
  
  // "fmt " sub-chunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(numChannels * (bitsPerSample / 8), 32); // BlockAlign
  header.writeUInt16LE(bitsPerSample, 34);
  
  // "data" sub-chunk
  header.write('data', 36);
  header.writeUInt32LE(0, 40); // Subchunk2Size (0 for streaming, will be unknown)
  
  return header;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type");

  // Stream live microphone continuously
  if (type === "live-mic") {
    try {
      // Get available capture devices
      const { capture: captureDevices } = await getAudioDevices();
      logger.info("Starting continuous microphone stream");

      // Create a ReadableStream that captures microphone audio continuously
      const readableStream = new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            let recordingProcess: any = null;
            let isActive = true;
            let headerSent = false;

            // Send WAV header first
            const wavHeader = createWavHeader(44100, 1, 16);
            controller.enqueue(wavHeader);
            headerSent = true;

            // Function to start recording with format fallback
            const startRecording = async () => {
              // Try specific devices first
              for (const device of captureDevices) {
                try {
                  logger.info(`Starting continuous recording - Device: ${device.id}, Format: S16_LE, Rate: 44100Hz`);

                  // Use spawn instead of exec for streaming (no buffer limits)
                  recordingProcess = spawn('arecord', [
                    '-D', device.id,
                    '-f', 'S16_LE',
                    '-r', '44100',
                    '-c', '1'
                  ]);

                  // Handle recording process exit
                  recordingProcess.on('close', (code: number, signal: string) => {
                    logger.debug(`arecord exited - code: ${code}, signal: ${signal}`);

                    if (code !== 0 && !signal) {
                      logger.error('Microphone recording error:', { code, signal });
                    }

                    if (isActive) {
                      try {
                        controller.close();
                      } catch (e) {
                        logger.debug('Controller already closed');
                      }
                    }
                  });

                  // Handle errors from arecord process
                  recordingProcess.on('error', (error: any) => {
                    logger.error('arecord process error:', error.message);
                  });

                  // Stream audio data from stdout
                  recordingProcess.stdout.on('data', (chunk: Buffer) => {
                    if (isActive) {
                      try {
                        // Send raw PCM data directly
                        controller.enqueue(new Uint8Array(chunk));
                      } catch (e) {
                        logger.error('Failed to enqueue audio chunk:', e);
                        isActive = false;
                        try {
                          if (recordingProcess) {
                            recordingProcess.kill('SIGTERM');
                          }
                          controller.close();
                        } catch (err) {
                          logger.debug('Error closing stream');
                        }
                      }
                    }
                  });

                  // Log stderr separately (warnings, errors)
                  recordingProcess.stderr.on('data', (chunk: Buffer) => {
                    const msg = chunk.toString();
                    // Only log actual errors, not warnings about rate
                    if (!msg.includes('Warning: rate is not accurate')) {
                      logger.debug('Microphone stderr:', msg);
                    }
                  });

                  // Check if process started successfully
                  return new Promise<boolean>((resolve) => {
                    setTimeout(() => {
                      if (recordingProcess && !recordingProcess.killed) {
                        resolve(true);
                      } else {
                        resolve(false);
                      }
                    }, 100);
                  });
                } catch (formatError) {
                  logger.debug(`Device ${device.id} failed, trying next...`);
                }
              }

              // Try default device as fallback
              try {
                logger.info('Trying default capture device');
                recordingProcess = spawn('arecord', [
                  '-f', 'S16_LE',
                  '-r', '44100',
                  '-c', '1'
                ]);

                recordingProcess.on('close', (code: number) => {
                  if (isActive) {
                    try {
                      controller.close();
                    } catch (e) {
                      logger.debug('Controller already closed');
                    }
                  }
                });

                recordingProcess.stdout.on('data', (chunk: Buffer) => {
                  if (isActive) {
                    try {
                      controller.enqueue(new Uint8Array(chunk));
                    } catch (e) {
                      logger.error('Failed to enqueue audio chunk:', e);
                      isActive = false;
                      recordingProcess?.kill('SIGTERM');
                    }
                  }
                });

                recordingProcess.stderr.on('data', (chunk: Buffer) => {
                  const msg = chunk.toString();
                  if (!msg.includes('Warning: rate is not accurate')) {
                    logger.debug('Microphone stderr:', msg);
                  }
                });

                return new Promise<boolean>((resolve) => {
                  setTimeout(() => {
                    if (recordingProcess && !recordingProcess.killed) {
                      resolve(true);
                    } else {
                      resolve(false);
                    }
                  }, 100);
                });
              } catch (error) {
                logger.error('Failed to start default device:', error);
                return false;
              }
            };

            const recordingStarted = await startRecording();

            if (!recordingStarted) {
              logger.error('Failed to start recording from any device');
              try {
                controller.close();
              } catch (e) {
                logger.debug('Error closing stream');
              }
            }

            // Handle client disconnect
            request.signal.addEventListener('abort', () => {
              logger.info('Client disconnected from microphone stream');
              isActive = false;
              if (recordingProcess) {
                try {
                  recordingProcess.kill('SIGTERM');
                } catch (e) {
                  logger.debug('Error killing recording process');
                }
              }
              try {
                controller.close();
              } catch (e) {
                logger.debug('Controller already closed');
              }
            });
          } catch (error) {
            logger.error('Stream start error:', error);
            try {
              controller.close();
            } catch (e) {
              logger.debug('Controller already closed');
            }
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          'Content-Type': 'audio/wav',
          'Transfer-Encoding': 'chunked',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    } catch (error) {
      logger.error('Microphone stream error:', error);
      return new Response('Stream error', { status: 500 });
    }
  }

  return new Response('Invalid request', { status: 400 });
}



