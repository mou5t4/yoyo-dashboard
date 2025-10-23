import { json, unstable_parseMultipartFormData, unstable_createMemoryUploadHandler, type ActionFunctionArgs } from '@remix-run/node';
import { saveMediaFile } from '~/services/media.service';
import { logger } from '~/lib/logger.server';

// Store file data temporarily
const uploadedFiles = new Map<string, { name: string; type: string; size: number; data: Buffer }>();

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const uploadHandler = async ({ name, data, filename, contentType }: any) => {
      if (name !== 'file') {
        return undefined;
      }

      const chunks: Uint8Array[] = [];
      for await (const chunk of data) {
        chunks.push(chunk);
      }
      
      const buffer = Buffer.concat(chunks);
      const fileId = `${Date.now()}-${Math.random()}`;
      
      uploadedFiles.set(fileId, {
        name: filename,
        type: contentType,
        size: buffer.length,
        data: buffer,
      });
      
      return fileId;
    };

    const formData = await unstable_parseMultipartFormData(request, uploadHandler);
    const fileId = formData.get('file') as string;

    if (!fileId) {
      return json({ error: 'No file provided' }, { status: 400 });
    }

    const file = uploadedFiles.get(fileId);
    uploadedFiles.delete(fileId);

    if (!file) {
      return json({ error: 'File data not found' }, { status: 400 });
    }

    const mediaFile = await saveMediaFile(file);
    return json({ success: true, media: mediaFile });
  } catch (error: any) {
    logger.error('File upload failed', error);
    return json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}

