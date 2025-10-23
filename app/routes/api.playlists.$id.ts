import { json, type ActionFunctionArgs } from '@remix-run/node';
import { updatePlaylist, deletePlaylist } from '~/services/media.service';
import { logger } from '~/lib/logger.server';

export async function action({ request, params }: ActionFunctionArgs) {
  const { id } = params;

  if (!id) {
    return json({ error: 'Playlist ID required' }, { status: 400 });
  }

  try {
    if (request.method === 'PUT') {
      const body = await request.json();
      const { name } = body;

      if (!name || typeof name !== 'string') {
        return json({ error: 'Playlist name required' }, { status: 400 });
      }

      const playlist = await updatePlaylist(id, name);
      return json({ success: true, playlist });
    }

    if (request.method === 'DELETE') {
      await deletePlaylist(id);
      return json({ success: true });
    }

    return json({ error: 'Method not allowed' }, { status: 405 });
  } catch (error: any) {
    logger.error('Playlist operation failed', error);
    return json({ error: error.message || 'Operation failed' }, { status: 500 });
  }
}





