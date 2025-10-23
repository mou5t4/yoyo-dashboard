import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, X } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { Progress } from '~/components/ui/progress';

interface AudioPlayerProps {
  title: string;
  artist?: string;
  src: string;
  onClose?: () => void;
  audioMode?: 'browser' | 'device';
}

export function AudioPlayer({ title, artist, src, onClose, audioMode = 'browser' }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = async () => {
    if (audioMode === 'device') {
      // Handle device audio playback
      setIsLoading(true);
      try {
        if (isPlaying) {
          // Stop device audio
          const response = await fetch('/api/audio/play', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'action=stop'
          });
          const result = await response.json();
          if (result.success) {
            setIsPlaying(false);
          }
        } else {
          // Start device audio
          const response = await fetch('/api/audio/play', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `action=play&filePath=${encodeURIComponent(src)}`
          });
          const result = await response.json();
          if (result.success) {
            setIsPlaying(true);
            // For device mode, we can't track progress easily, so we'll estimate
            // You might want to implement a more sophisticated progress tracking system
            setDuration(180); // Default 3 minutes, could be improved
          }
        }
      } catch (error) {
        console.error('Device audio playback failed:', error);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Handle browser audio playback (existing logic)
      const audio = audioRef.current;
      if (!audio) return;

      if (isPlaying) {
        audio.pause();
      } else {
        audio.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (value: number) => {
    if (audioMode === 'device') {
      // Seeking not supported in device mode
      return;
    }
    
    const audio = audioRef.current;
    if (!audio) return;
    
    audio.currentTime = value;
    setCurrentTime(value);
  };

  const handleVolumeChange = (value: number) => {
    if (audioMode === 'device') {
      // Volume control not supported in device mode
      return;
    }
    
    const audio = audioRef.current;
    if (!audio) return;
    
    audio.volume = value;
    setVolume(value);
    setIsMuted(value === 0);
  };

  const toggleMute = () => {
    if (audioMode === 'device') {
      // Mute control not supported in device mode
      return;
    }
    
    const audio = audioRef.current;
    if (!audio) return;
    
    if (isMuted) {
      audio.volume = volume;
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="p-4 bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-purple-500/50">
      <audio ref={audioRef} src={src} />
      
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">{title}</h3>
          {artist && <p className="text-sm text-gray-300 truncate">{artist}</p>}
        </div>
        {onClose && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="ml-2 flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-1 mb-3">
        {audioMode === 'browser' ? (
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={(e) => handleSeek(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, rgb(168, 85, 247) 0%, rgb(168, 85, 247) ${(currentTime / duration) * 100}%, rgb(55, 65, 81) ${(currentTime / duration) * 100}%, rgb(55, 65, 81) 100%)`
            }}
          />
        ) : (
          <div className="w-full h-2 bg-gray-700 rounded-lg">
            <div className="h-full bg-purple-500 rounded-lg animate-pulse"></div>
          </div>
        )}
        <div className="flex justify-between text-xs text-gray-400">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <Button
          size="lg"
          onClick={togglePlay}
          disabled={isLoading}
          className="bg-purple-600 hover:bg-purple-700 rounded-full h-12 w-12 p-0"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
          ) : isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5 ml-0.5" />
          )}
        </Button>

        {/* Volume Control - Only show in browser mode */}
        {audioMode === 'browser' && (
          <div className="flex items-center space-x-2 flex-1 max-w-xs ml-4">
            <button onClick={toggleMute} className="text-gray-300 hover:text-white">
              {isMuted ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, rgb(168, 85, 247) 0%, rgb(168, 85, 247) ${(isMuted ? 0 : volume) * 100}%, rgb(55, 65, 81) ${(isMuted ? 0 : volume) * 100}%, rgb(55, 65, 81) 100%)`
              }}
            />
          </div>
        )}
        
        {/* Audio Mode Indicator */}
        <div className="flex items-center space-x-2 text-xs text-gray-400">
          <div className={`w-2 h-2 rounded-full ${audioMode === 'device' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
          <span>{audioMode === 'device' ? 'Device' : 'Browser'}</span>
        </div>
      </div>

      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          background: white;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: white;
          border-radius: 50%;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
      `}</style>
    </Card>
  );
}


