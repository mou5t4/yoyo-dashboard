import { json, type ActionFunctionArgs } from '@remix-run/node';
import { addToPlaylist, removeFromPlaylist } from '~/services/media.service';
import { logger } from '~/lib/logger.server';

export async function action({ request, params }: ActionFunctionArgs) {
  const { id: playlistId } = params;

  if (!playlistId) {
    return json({ error: 'Playlist ID required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { mediaId } = body;

    if (!mediaId || typeof mediaId !== 'string') {
      return json({ error: 'Media ID required' }, { status: 400 });
    }

    if (request.method === 'POST') {
      const item = await addToPlaylist(playlistId, mediaId);
      return json({ success: true, item });
    }

    if (request.method === 'DELETE') {
      await removeFromPlaylist(playlistId, mediaId);
      return json({ success: true });
    }

    return json({ error: 'Method not allowed' }, { status: 405 });
  } catch (error: any) {
    logger.error('Playlist item operation failed', error);
    return json({ error: error.message || 'Operation failed' }, { status: 500 });
  }
}





