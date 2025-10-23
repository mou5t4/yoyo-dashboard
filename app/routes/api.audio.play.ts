import { json, type ActionFunctionArgs } from "@remix-run/node";
import { playAudioOnDevice, stopDeviceAudio } from "~/services/audio.service.server";

export async function action({ request }: ActionFunctionArgs) {
  // Handle JSON POST requests
  if (request.method === "POST" && request.headers.get("Content-Type")?.includes("application/json")) {
    const body = await request.json();
    const { filePath } = body;
    
    // If no filePath, treat it as a stop request
    if (!filePath) {
      const result = await stopDeviceAudio();
      return json(result);
    }

    const result = await playAudioOnDevice(filePath);
    return json(result);
  }

  // Handle form data requests
  const formData = await request.formData();
  const action = formData.get("action");

  if (action === "play") {
    const filePath = formData.get("filePath") as string;
    
    if (!filePath) {
      return json({ error: "File path is required", success: false }, { status: 400 });
    }

    const result = await playAudioOnDevice(filePath);
    return json(result);
  }

  if (action === "stop") {
    const result = await stopDeviceAudio();
    return json(result);
  }

  return json({ error: "Invalid action", success: false }, { status: 400 });
}
