import React from 'react';
import { cn } from '~/lib/utils';
import { Volume2, Mic, Check, Radio } from 'lucide-react';

interface AudioDevice {
  id: string;
  name: string;
  isDefault: boolean;
  type?: 'playback' | 'capture';
}

interface AudioDeviceCardProps {
  device: AudioDevice;
  isSelected?: boolean;
  onSelect?: (device: AudioDevice) => void;
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

export function AudioDeviceCard({
  device,
  isSelected = false,
  onSelect,
  className,
  size = 'medium'
}: AudioDeviceCardProps) {
  const isPlayback = device.type === 'playback';
  const Icon = isPlayback ? Volume2 : Mic;

  const sizeConfig = {
    small: {
      card: 'p-1.5',
      icon: 'h-4 w-4',
      title: 'text-sm',
      subtitle: 'text-xs',
      badge: 'text-xs px-2 py-1'
    },
    medium: {
      card: 'p-2',
      icon: 'h-5 w-5',
      title: 'text-base',
      subtitle: 'text-sm',
      badge: 'text-xs px-2 py-1'
    },
    large: {
      card: 'p-3',
      icon: 'h-6 w-6',
      title: 'text-lg',
      subtitle: 'text-base',
      badge: 'text-sm px-3 py-1'
    }
  };

  const config = sizeConfig[size];

  const handleClick = () => {
    if (onSelect) {
      onSelect(device);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      className={cn(
        'group relative rounded-lg border-2 transition-all duration-300 cursor-pointer',
        'hover:shadow-lg hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50',
        isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600',
        config.card,
        className
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-pressed={isSelected}
      aria-label={`Select ${device.name} audio device`}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2">
          <div className="flex items-center justify-center w-6 h-6 bg-blue-500 rounded-full">
            <Check className="h-4 w-4 text-white" />
          </div>
        </div>
      )}

      {/* Active device glow effect */}
      {device.isDefault && (
        <div className={cn(
          'absolute inset-0 rounded-lg pointer-events-none',
          isSelected ? 'animate-pulse-glow' : 'ring-2 ring-green-400 ring-opacity-30'
        )} />
      )}

      {/* Device icon and info */}
      <div className="flex items-start space-x-3">
        <div className={cn(
          'flex-shrink-0 p-2 rounded-lg transition-colors duration-300',
          isSelected
            ? 'bg-blue-100 dark:bg-blue-900/40'
            : 'bg-gray-100 dark:bg-gray-700 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20'
        )}>
          <Icon className={cn(
            'transition-colors duration-300',
            isSelected
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400',
            config.icon
          )} />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className={cn(
            'font-semibold text-gray-900 dark:text-white transition-colors duration-300',
            'group-hover:text-blue-900 dark:group-hover:text-blue-100',
            config.title
          )}>
            {device.name}
          </h3>
          
          <p className={cn(
            'text-gray-500 dark:text-gray-400 mt-1 font-mono transition-colors duration-300',
            'group-hover:text-gray-600 dark:group-hover:text-gray-300',
            config.subtitle
          )}>
            {device.id}
          </p>

          {/* Device type badge */}
          <div className="mt-2">
            <span className={cn(
              'inline-flex items-center px-2 py-1 rounded-full font-medium transition-colors duration-300',
              isPlayback
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                : 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
              config.badge
            )}>
              <Radio className="h-3 w-3 mr-1" />
              {isPlayback ? 'Output' : 'Input'}
            </span>
          </div>
        </div>
      </div>

      {/* Default device badge */}
      {device.isDefault && (
        <div className="absolute bottom-2 left-2">
          <span className={cn(
            'inline-flex items-center px-2 py-1 rounded-full font-medium',
            'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
            config.badge
          )}>
            Active
          </span>
        </div>
      )}

      {/* Hover overlay */}
      <div className={cn(
        'absolute inset-0 rounded-lg opacity-0 transition-opacity duration-300 pointer-events-none',
        'bg-gradient-to-r from-blue-500/5 to-transparent',
        'group-hover:opacity-100'
      )} />
    </div>
  );
}

// Grid container for device cards
export function AudioDeviceGrid({
  devices,
  selectedDevice,
  onDeviceSelect,
  className
}: {
  devices: AudioDevice[];
  selectedDevice?: AudioDevice;
  onDeviceSelect?: (device: AudioDevice) => void;
  className?: string;
}) {
  if (devices.length === 0) {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center py-8 px-4',
        'text-gray-500 dark:text-gray-400',
        className
      )}>
        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
          <Volume2 className="h-8 w-8 text-gray-400" />
        </div>
        <p className="text-lg font-medium mb-2">No devices found</p>
        <p className="text-sm text-center">
          No audio devices are currently available on your system.
        </p>
      </div>
    );
  }

  return (
    <div className={cn(
      'grid gap-1.5',
      'grid-cols-1 sm:grid-cols-2 lg:grid-cols-1',
      className
    )}>
      {devices.map((device) => (
        <AudioDeviceCard
          key={device.id}
          device={device}
          isSelected={selectedDevice?.id === device.id}
          onSelect={onDeviceSelect}
          size="medium"
        />
      ))}
    </div>
  );
}
