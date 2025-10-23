import { X, Check } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { useTranslation } from 'react-i18next';

interface Playlist {
  id: string;
  name: string;
  items: Array<{ media: { id: string } }>;
}

interface AddToPlaylistDialogProps {
  mediaId: string;
  playlists: Playlist[];
  onClose: () => void;
  onAddToPlaylist: (playlistId: string, mediaId: string) => Promise<void>;
}

export function AddToPlaylistDialog({
  mediaId,
  playlists,
  onClose,
  onAddToPlaylist,
}: AddToPlaylistDialogProps) {
  const { t } = useTranslation();

  const handleAdd = async (playlistId: string) => {
    await onAddToPlaylist(playlistId, mediaId);
    onClose();
  };

  const isInPlaylist = (playlistId: string) => {
    const playlist = playlists.find(p => p.id === playlistId);
    return playlist?.items.some(item => item.media.id === mediaId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <Card className="w-full max-w-md p-6 bg-gray-900 border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            {t('content.addToPlaylist')}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {playlists.length === 0 ? (
            <p className="text-center text-gray-400 py-8">
              {t('content.noPlaylistsCreate')}
            </p>
          ) : (
            playlists.map((playlist) => {
              const inPlaylist = isInPlaylist(playlist.id);
              return (
                <button
                  key={playlist.id}
                  onClick={() => !inPlaylist && handleAdd(playlist.id)}
                  disabled={inPlaylist}
                  className={`
                    w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors
                    ${inPlaylist 
                      ? 'bg-green-900/30 text-green-400 cursor-not-allowed' 
                      : 'bg-gray-800 hover:bg-purple-600 text-white'
                    }
                  `}
                >
                  <span>{playlist.name}</span>
                  {inPlaylist && <Check className="h-5 w-5" />}
                </button>
              );
            })
          )}
        </div>

        <div className="mt-4">
          <Button onClick={onClose} variant="outline" className="w-full">
            {t('content.cancel')}
          </Button>
        </div>
      </Card>
    </div>
  );
}





