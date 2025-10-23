import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from '@remix-run/node';
import { createPlaylist, getPlaylists } from '~/services/media.service';
import { logger } from '~/lib/logger.server';

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const playlists = await getPlaylists();
    return json({ success: true, playlists });
  } catch (error) {
    logger.error('Failed to fetch playlists', error);
    return json({ error: 'Failed to fetch playlists' }, { status: 500 });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string') {
      return json({ error: 'Playlist name required' }, { status: 400 });
    }

    const playlist = await createPlaylist(name);
    return json({ success: true, playlist });
  } catch (error: any) {
    logger.error('Failed to create playlist', error);
    return json({ error: error.message || 'Failed to create playlist' }, { status: 500 });
  }
}


