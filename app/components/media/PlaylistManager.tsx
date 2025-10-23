import { useState } from 'react';
import { Folder, Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Badge } from '~/components/ui/badge';
import { useTranslation } from 'react-i18next';

interface Playlist {
  id: string;
  name: string;
  items: Array<{
    media: {
      id: string;
      title: string;
    };
  }>;
}

interface PlaylistManagerProps {
  playlists: Playlist[];
  selectedPlaylistId: string | null;
  onSelectPlaylist: (id: string | null) => void;
  onCreatePlaylist: (name: string) => Promise<void>;
  onUpdatePlaylist: (id: string, name: string) => Promise<void>;
  onDeletePlaylist: (id: string) => Promise<void>;
}

export function PlaylistManager({
  playlists,
  selectedPlaylistId,
  onSelectPlaylist,
  onCreatePlaylist,
  onUpdatePlaylist,
  onDeletePlaylist,
}: PlaylistManagerProps) {
  const { t } = useTranslation("content");
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleCreate = async () => {
    if (!newPlaylistName.trim()) return;
    
    await onCreatePlaylist(newPlaylistName.trim());
    setNewPlaylistName('');
    setIsCreating(false);
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    
    await onUpdatePlaylist(id, editName.trim());
    setEditingId(null);
    setEditName('');
  };

  const handleDelete = async (id: string) => {
    if (confirm(t('confirmDeletePlaylist'))) {
      await onDeletePlaylist(id);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center space-x-2">
            <Folder className="h-4 w-4 text-purple-400" />
            <span>{t('playlists')}</span>
          </CardTitle>
          <Button
            onClick={() => setIsCreating(true)}
            size="sm"
            className="h-7 px-2 bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">

        {/* All Files Button */}
        <Button
          variant={selectedPlaylistId === null ? "default" : "ghost"}
          className={`w-full justify-start h-8 text-xs ${
            selectedPlaylistId === null ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => onSelectPlaylist(null)}
        >
          <Folder className="h-3 w-3 mr-2" />
          {t('allFiles')}
        </Button>

        {/* Create New Playlist Form */}
        {isCreating && (
          <div className="p-2 bg-gray-800 rounded-lg border border-purple-500">
            <Input
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              placeholder={t('playlistName')}
              className="mb-2 h-8 text-xs"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') setIsCreating(false);
              }}
            />
            <div className="flex gap-1">
              <Button size="sm" onClick={handleCreate} className="flex-1 h-7 text-xs">
                <Check className="h-3 w-3 mr-1" />
                {t('create')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsCreating(false)} className="h-7 px-2">
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Playlists List */}
        {playlists.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-xs text-gray-500">{t('noPlaylists')}</p>
          </div>
        ) : (
          playlists.map((playlist) => (
            <div key={playlist.id}>
              {editingId === playlist.id ? (
                <div className="p-2 bg-gray-800 rounded-lg border border-purple-500">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="mb-2 h-8 text-xs"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUpdate(playlist.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                  />
                  <div className="flex gap-1">
                    <Button size="sm" onClick={() => handleUpdate(playlist.id)} className="flex-1 h-7 text-xs">
                      <Check className="h-3 w-3 mr-1" />
                      {t('save')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="h-7 px-2">
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center group">
                  <Button
                    variant={selectedPlaylistId === playlist.id ? "default" : "ghost"}
                    className={`flex-1 justify-start h-8 text-xs ${
                      selectedPlaylistId === playlist.id ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                    onClick={() => onSelectPlaylist(playlist.id)}
                  >
                    <Folder className="h-3 w-3 mr-2" />
                    <span className="truncate">{playlist.name}</span>
                    <Badge variant="outline" className="ml-2 text-xs">
                      {playlist.items.length}
                    </Badge>
                  </Button>
                  
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                      onClick={() => {
                        setEditingId(playlist.id);
                        setEditName(playlist.name);
                      }}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                      onClick={() => handleDelete(playlist.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

