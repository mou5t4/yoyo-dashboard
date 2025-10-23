import { json, type ActionFunctionArgs } from '@remix-run/node';
import { renameMediaFile } from '~/services/media.service';
import { logger } from '~/lib/logger.server';

export async function action({ request, params }: ActionFunctionArgs) {
  if (request.method !== 'PUT') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  const { id } = params;

  if (!id) {
    return json({ error: 'Media ID required' }, { status: 400 });
  }

  try {
    const { title } = await request.json();

    if (!title || !title.trim()) {
      return json({ error: 'Title is required' }, { status: 400 });
    }

    await renameMediaFile(id, title.trim());
    return json({ success: true });
  } catch (error: any) {
    logger.error('Failed to rename media file', error);
    return json({ error: error.message || 'Rename failed' }, { status: 500 });
  }
}
