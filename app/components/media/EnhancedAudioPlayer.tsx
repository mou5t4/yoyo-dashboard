import React, { useState, useRef, useEffect } from 'react';
import { Card } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Progress } from '~/components/ui/progress';
import { Volume2, VolumeX, X } from 'lucide-react';
import { cn } from '~/lib/utils';
import { useAudioMode } from '~/contexts/AudioModeContext';

interface EnhancedAudioPlayerProps {
  src: string;
  title: string;
  artist?: string;
  onClose: () => void;
}

export default function EnhancedAudioPlayer({ src, title, artist, onClose }: EnhancedAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolumeControl, setShowVolumeControl] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const { audioMode } = useAudioMode();

  const togglePlay = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      if (audioMode === 'browser') {
        if (audioRef.current) {
          if (isPlaying) {
            audioRef.current.pause();
          } else {
            await audioRef.current.play();
          }
        }
      } else {
        if (isPlaying) {
          const response = await fetch('/api/audio/play', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'action=stop'
          });
          const result = await response.json();
          if (result.success) {
            setIsPlaying(false);
            if (audioRef.current) {
              audioRef.current.pause();
            }
          }
        } else {
          const response = await fetch('/api/audio/play', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `action=play&filePath=${encodeURIComponent(src)}`
          });
          const result = await response.json();
          if (result.success) {
            setIsPlaying(true);
            if (audioRef.current) {
              audioRef.current.volume = 0;
              await audioRef.current.play();
            }
          }
        }
      }
    } catch (error) {
      console.error('Error toggling play:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current && audioMode === 'browser') {
      const newTime = (value[0] / 100) * duration;
      audioRef.current.currentTime = newTime;
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="enhanced-audio-player w-full max-w-4xl mx-auto">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <Volume2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
              {artist && (
                <p className="text-gray-600 dark:text-gray-300">{artist}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Audio Mode Indicator */}
            <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-gray-200 dark:bg-gray-800/50">
              <div className={cn(
                "w-2 h-2 rounded-full",
                audioMode === 'browser' ? "bg-blue-400" : "bg-green-400"
              )} />
              <span className="text-xs text-gray-600 dark:text-gray-300">
                {audioMode === 'browser' ? 'Browser' : 'Device'}
              </span>
            </div>
            
            {/* Close Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-200 dark:text-gray-500 dark:hover:text-gray-300 p-0"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Audio Element - Hidden */}
        <audio 
          ref={audioRef}
          src={src}
          crossOrigin="anonymous" 
          preload="auto" 
          style={{ display: 'none' }}
          volume={audioMode === 'device' ? 0 : volume / 100}
          onTimeUpdate={() => {
            if (audioRef.current) {
              setCurrentTime(audioRef.current.currentTime);
            }
          }}
          onLoadedMetadata={() => {
            if (audioRef.current) {
              setDuration(audioRef.current.duration);
            }
          }}
          onEnded={() => setIsPlaying(false)}
          onPlay={() => {
            if (audioMode === 'browser') {
              setIsPlaying(true);
            }
          }}
          onPause={() => {
            if (audioMode === 'browser') {
              setIsPlaying(false);
            }
          }}
        />

        {/* Progress Bar */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2">
            {/* Play/Pause Button - at the start of progress bar */}
            <button
              onClick={togglePlay}
              disabled={isLoading}
              className="text-2xl font-bold text-white hover:opacity-80 transition-opacity flex-shrink-0"
              style={{ cursor: 'pointer', background: 'none', border: 'none', padding: '0' }}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                '⏸'
              ) : (
                '▶'
              )}
            </button>

            {/* Progress Bar */}
            <div className="flex-1">
              <Progress
                value={(currentTime / duration) * 100}
                onValueChange={handleSeek}
                className="h-2"
              />
            </div>

            {/* Volume Control - Integrated with button */}
            <div className="flex-shrink-0 relative">
              <Button
                variant="ghost"
                size="sm"
                onMouseEnter={() => audioMode === 'browser' && setShowVolumeControl(true)}
                onMouseLeave={() => setShowVolumeControl(false)}
                onClick={() => toggleMute()}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </Button>

              {/* Volume Slider - Appears on hover/click (only in browser mode) */}
              {audioMode === 'browser' && showVolumeControl && (
                <div 
                  className="absolute right-0 bottom-full mb-2 bg-gray-800 dark:bg-gray-700 rounded-lg p-3 w-10"
                  onMouseEnter={() => setShowVolumeControl(true)}
                  onMouseLeave={() => setShowVolumeControl(false)}
                  style={{ zIndex: 50 }}
                >
                  {/* Vertical Volume Slider */}
                  <div className="flex flex-col items-center gap-2 h-32">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => {
                        const newVolume = parseInt(e.target.value);
                        setVolume(newVolume);
                        setIsMuted(newVolume === 0);
                        if (audioRef.current) {
                          audioRef.current.volume = newVolume / 100;
                        }
                      }}
                      className="h-24 appearance-none bg-gray-600 dark:bg-gray-500 rounded-lg cursor-pointer"
                      style={{
                        writingMode: 'bt-lr',
                        WebkitAppearance: 'slider-vertical',
                      }}
                    />
                    <div className="text-xs text-gray-300">
                      {isMuted ? 0 : volume}%
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Time Display */}
          <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 pl-8">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        {/* The Volume Control section is now part of the main control row */}
      </div>
    </Card>
  );
}