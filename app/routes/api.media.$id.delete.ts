import { json, type ActionFunctionArgs } from '@remix-run/node';
import { deleteMediaFile } from '~/services/media.service';
import { logger } from '~/lib/logger.server';

export async function action({ request, params }: ActionFunctionArgs) {
  if (request.method !== 'DELETE') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  const { id } = params;

  if (!id) {
    return json({ error: 'Media ID required' }, { status: 400 });
  }

  try {
    await deleteMediaFile(id);
    return json({ success: true });
  } catch (error: any) {
    logger.error('Failed to delete media file', error);
    return json({ error: error.message || 'Delete failed' }, { status: 500 });
  }
}


