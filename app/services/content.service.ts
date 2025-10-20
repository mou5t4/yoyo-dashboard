import { serviceClient } from './base.service';
import { logger } from '~/lib/logger.server';

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
    logger.warn('Content API unavailable, using mock data', { endpoint: '/content/current-playback' });
    // Return mock playback when API is unavailable
    return {
      type: 'music',
      title: 'Happy Kids Songs',
      artist: 'Children\'s Music Collection',
      progress: 45,
    };
  }
}

export async function getContentLibrary(): Promise<ContentItem[]> {
  try {
    const items = await serviceClient.get<ContentItem[]>('/content/playlists');
    return items;
  } catch (error) {
    logger.warn('Content API unavailable, using mock data', { endpoint: '/content/playlists' });
    // Return mock library when API is unavailable
    return [
      {
        id: '1',
        type: 'playlist',
        title: 'Kids Favorites',
        creator: 'Family',
        explicit: false,
        enabled: true,
      },
      {
        id: '2',
        type: 'podcast',
        title: 'Story Time',
        creator: 'Kids Podcasts',
        explicit: false,
        enabled: true,
      },
    ];
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

