import { Music, Trash2, FolderPlus, MoreVertical, Volume2, Play, Pause, Edit } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { useState, useRef, useEffect } from 'react';
import { useAudioMode } from '~/contexts/AudioModeContext';

interface MediaFileCardProps {
  id: string;
  title: string;
  artist?: string;
  album?: string;
  duration?: number;
  fileSize: number;
  filePath: string;
  playlists?: Array<{ id: string; name: string }>;
  onPlay: (id: string, title: string, artist: string | undefined, filePath: string) => void;
  onDelete: (id: string) => void;
  onAddToPlaylist: (mediaId: string) => void;
  onRename: (id: string, newTitle: string) => void;
  isCurrentlyPlaying?: string | null;
  onStopAllOthers?: () => void;
}

export function MediaFileCard({
  id,
  title,
  artist,
  album,
  duration,
  fileSize,
  filePath,
  playlists = [],
  onPlay,
  onDelete,
  onAddToPlaylist,
  onRename,
  isCurrentlyPlaying,
  onStopAllOthers,
}: MediaFileCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(100);
  const [showVolumeControl, setShowVolumeControl] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [newTitle, setNewTitle] = useState(title);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const { audioMode } = useAudioMode();

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        
        // Also stop device audio if it's playing
        fetch('/api/audio/play', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),  // Empty body = stop request
        }).catch(error => console.error('Device audio stop failed:', error));
      } else {
        // Stop all other players
        if (onStopAllOthers) {
          onStopAllOthers();
        }
        // Expand the card and show player
        if (!isExpanded) {
          setIsExpanded(true);
          onPlay(id, title, artist, filePath);
        }
        audioRef.current.play().catch(err => console.error('Playback error:', err));
        setIsPlaying(true);
      }
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
    }
  };

  const handleSeek = (newTime: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = (newTime / 100) * (audioRef.current.duration || 0);
    }
  };

  const handleExpand = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded && !isPlaying) {
      onPlay(id, title, artist, filePath);
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  // If this card is not the currently playing one and it was playing, stop it and collapse it
  useEffect(() => {
    if (isCurrentlyPlaying && isCurrentlyPlaying !== id && (isPlaying || isExpanded) && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      setIsExpanded(false); // Collapse the card when another song plays
    }
  }, [isCurrentlyPlaying, id, isPlaying, isExpanded]);

  return (
    <>
      {/* Main Card */}
      <div className={`border-2 border-gray-700 rounded-xl hover:border-purple-500 transition-all bg-gray-800/50 group overflow-visible ${
        isExpanded ? 'border-purple-500' : ''
      }`}>
        <div className="flex items-center gap-3 p-4">
          {/* Album Art Placeholder */}
          <div className="flex-shrink-0 h-16 w-16 bg-gradient-to-br from-purple-900 to-pink-900 rounded-lg flex items-center justify-center">
            <Music className="h-8 w-8 text-purple-300" />
          </div>

          {/* File Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate">{title}</h3>
            {artist && <p className="text-sm text-gray-300 truncate">{artist}</p>}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {album && (
                <Badge variant="outline" className="text-xs text-gray-400 border-gray-600">
                  {album}
                </Badge>
              )}
              {duration && (
                <span className="text-xs text-gray-500">{formatDuration(duration)}</span>
              )}
              <span className="text-xs text-gray-500">{formatFileSize(fileSize)}</span>
            </div>
            {playlists.length > 0 && (
              <div className="flex gap-1 mt-1 flex-wrap">
                {playlists.map((playlist) => (
                  <Badge 
                    key={playlist.id} 
                    className="text-xs bg-purple-900/50 text-purple-300 border-purple-800"
                  >
                    {playlist.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              size="sm"
              onClick={togglePlay}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>

            <div className="relative">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowMenu(!showMenu)}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-20 py-1">
                    <button
                      onClick={() => {
                        onAddToPlaylist(id);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700 flex items-center gap-2"
                    >
                      <FolderPlus className="h-4 w-4" />
                      Add to Playlist
                    </button>
                    <button
                      onClick={() => {
                        setShowRenameDialog(true);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700 flex items-center gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      Rename
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this file?')) {
                          onDelete(id);
                        }
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-700 flex items-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Audio Element - Always in DOM for immediate access */}
        <audio
          ref={audioRef}
          src={filePath}
          crossOrigin="anonymous"
          preload="auto"
          onTimeUpdate={() => {
            if (audioRef.current) {
              setCurrentTime(audioRef.current.currentTime);
            }
          }}
          onEnded={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        {/* Expanded Player Section */}
        {isExpanded && (
          <div className="border-t border-gray-700 p-4 bg-gray-900/50 space-y-4">

            {/* Player Controls */}
            <div className="flex items-center gap-3">
              {/* Progress Bar - Draggable */}
              <div className="flex-1">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={(currentTime / (audioRef.current?.duration || 1)) * 100}
                  onChange={(e) => handleSeek(Number(e.target.value))}
                  className="w-full h-1 appearance-none bg-gray-700 rounded-full accent-purple-500 cursor-pointer"
                  style={{
                    WebkitAppearance: 'slider-horizontal',
                  }}
                />
              </div>

              {/* Volume Control */}
              <div 
                className="relative flex-shrink-0 flex flex-col items-center gap-1"
                onMouseEnter={() => setShowVolumeControl(true)}
                onMouseLeave={() => setShowVolumeControl(false)}
              >
                {/* Volume Slider - Shows on hover, replaces icon */}
                {showVolumeControl ? (
                  <div className="flex items-center gap-1 bg-gray-700 border border-gray-600 rounded-lg p-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={(e) => handleVolumeChange(Number(e.target.value))}
                      onInput={(e) => handleVolumeChange(Number(e.target.value))}
                      className="w-20 h-1 appearance-none bg-gray-600 rounded-full accent-purple-500 cursor-pointer"
                      style={{
                        WebkitAppearance: 'slider-horizontal',
                      }}
                    />
                  </div>
                ) : (
                  /* Volume Icon Button - Hidden when slider is shown */
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowVolumeControl(!showVolumeControl)}
                    className="text-gray-400 hover:text-gray-200 p-0 h-8 w-8 flex items-center justify-center"
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Time Display */}
            <div className="flex justify-between text-xs text-gray-400">
              <span>{formatDuration(currentTime)}</span>
              <span>{formatDuration(audioRef.current?.duration || 0)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Rename Dialog */}
      {showRenameDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-6 w-96 space-y-4">
            <h3 className="text-lg font-semibold text-white">Rename File</h3>
            
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
              placeholder="Enter new file name"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onRename(id, newTitle);
                  setShowRenameDialog(false);
                  setNewTitle(title);
                } else if (e.key === 'Escape') {
                  setShowRenameDialog(false);
                  setNewTitle(title);
                }
              }}
              autoFocus
            />
            
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowRenameDialog(false);
                  setNewTitle(title);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-purple-600 hover:bg-purple-700"
                onClick={() => {
                  onRename(id, newTitle);
                  setShowRenameDialog(false);
                  setNewTitle(title);
                }}
              >
                Rename
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


