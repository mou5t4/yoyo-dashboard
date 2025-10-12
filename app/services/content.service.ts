import { serviceClient } from './base.service';
import { logger } from '~/lib/logger';

export interface ContentItem {
  id: string;
  type: 'playlist' | 'podcast' | 'album';
  title: string;
  creator: string;
  explicit: boolean;
  enabled: boolean;
}

export interface CurrentPlayback {
  type: 'music' | 'podcast';
  title: string;
  artist: string;
  progress: number;
}

export async function getCurrentPlayback(): Promise<CurrentPlayback | null> {
  try {
    const playback = await serviceClient.get<CurrentPlayback>('/content/current-playback');
    return playback;
  } catch (error) {
    logger.error('Failed to get current playback', error);
    return null;
  }
}

export async function getContentLibrary(): Promise<ContentItem[]> {
  try {
    const items = await serviceClient.get<ContentItem[]>('/content/playlists');
    return items;
  } catch (error) {
    logger.error('Failed to get content library', error);
    return [];
  }
}

export async function syncPlaylists(playlistIds: string[]): Promise<{ synced: number }> {
  try {
    const result = await serviceClient.post<{ synced: number }>('/content/sync-playlists', {
      playlistIds,
    });
    return result;
  } catch (error) {
    logger.error('Failed to sync playlists', error);
    return { synced: 0 };
  }
}

