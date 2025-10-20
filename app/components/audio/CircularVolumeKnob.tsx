import React, { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '~/lib/utils';

interface CircularVolumeKnobProps {
  value: number;
  onChange: (value: number) => void;
  muted?: boolean;
  label?: string;
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'success' | 'warning';
  disabled?: boolean;
  className?: string;
}

export function CircularVolumeKnob({
  value,
  onChange,
  muted = false,
  label,
  size = 'medium',
  color = 'primary',
  disabled = false,
  className
}: CircularVolumeKnobProps) {
  const [isDragging, setIsDragging] = useState(false);
  const knobRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<SVGCircleElement>(null);
  const sliderShadowRef = useRef<SVGCircleElement>(null);
  const gradateGroupRef = useRef<SVGGElement>(null);

  // Size configurations - balanced for card fit
  const sizeConfig = {
    small: { diameter: 250, scale: 0.5 },
    medium: { diameter: 300, scale: 0.6 },
    large: { diameter: 350, scale: 0.7 }
  };

  // Color configurations - using HSL for dynamic color changes
  const colorConfig = {
    primary: { hue: 200, saturation: 60 }, // Blue
    success: { hue: 120, saturation: 60 }, // Green
    warning: { hue: 40, saturation: 60 }   // Orange
  };

  const config = sizeConfig[size];
  const colors = colorConfig[color];
  
  // Convert value (0-100) to degrees (-135 to 135)
  const degrees = ((value / 100) * 270) - 135;
  const hue = degrees + 135 * 2;

  // Constants from the original CodePen
  const STEP = 32;
  const DEG_RANGE = 135;

  // Generate gradient lines
  const generateGradateLines = useCallback(() => {
    if (!gradateGroupRef.current) return;
    
    const lines = [];
    const Q = DEG_RANGE / STEP;
    
    for (let i = DEG_RANGE * -1; i <= DEG_RANGE; i += Q) {
      const isActive = i <= degrees;
      lines.push(
        <line
          key={i}
          data-deg={i}
          className={isActive ? 'active' : ''}
          style={{
            '--deg': `${i}deg`,
            '--h': `${i + DEG_RANGE * 2}`,
            '--a': isActive ? '1' : '0.2',
            '--s': isActive ? '60%' : '10%'
          } as React.CSSProperties}
          x1="300"
          y1="30"
          x2="300"
          y2="70"
          strokeLinecap="round"
          strokeWidth="10"
        />
      );
    }
    
    return lines;
  }, [degrees]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    setIsDragging(true);
    e.preventDefault();
    
    if (knobRef.current) {
      knobRef.current.classList.add('without-animate');
      knobRef.current.style.cursor = 'grabbing';
    }
  }, [disabled]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || disabled) return;
    
    if (knobRef.current) {
      const rect = knobRef.current.getBoundingClientRect();
      const CX = rect.width / 2;
      const CY = rect.height / 2;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const radians = Math.atan2(y - CY, x - CX);
      let degrees = Math.round((radians / Math.PI) * 180) + 90;

      degrees = degrees <= 180 ? degrees : degrees - 360;
      degrees = degrees <= DEG_RANGE * -1 ? DEG_RANGE * -1 : degrees;
      degrees = degrees >= DEG_RANGE ? DEG_RANGE : degrees;

      // Convert degrees back to 0-100 value
      const newValue = Math.round(((degrees + DEG_RANGE) / 270) * 100);
      onChange(Math.max(0, Math.min(100, newValue)));
    }
  }, [isDragging, disabled, onChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    
    if (knobRef.current) {
      knobRef.current.classList.remove('without-animate');
      knobRef.current.style.cursor = 'unset';
    }
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    setIsDragging(true);
    e.preventDefault();
    
    if (knobRef.current) {
      knobRef.current.classList.add('without-animate');
    }
  }, [disabled]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || disabled) return;
    e.preventDefault();
    
    if (knobRef.current && e.touches[0]) {
      const rect = knobRef.current.getBoundingClientRect();
      const CX = rect.width / 2;
      const CY = rect.height / 2;

      const x = e.touches[0].clientX - rect.left;
      const y = e.touches[0].clientY - rect.top;

      const radians = Math.atan2(y - CY, x - CX);
      let degrees = Math.round((radians / Math.PI) * 180) + 90;

      degrees = degrees <= 180 ? degrees : degrees - 360;
      degrees = degrees <= DEG_RANGE * -1 ? DEG_RANGE * -1 : degrees;
      degrees = degrees >= DEG_RANGE ? DEG_RANGE : degrees;

      // Convert degrees back to 0-100 value
      const newValue = Math.round(((degrees + DEG_RANGE) / 270) * 100);
      onChange(Math.max(0, Math.min(100, newValue)));
    }
  }, [isDragging, disabled, onChange]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    
    if (knobRef.current) {
      knobRef.current.classList.remove('without-animate');
    }
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return;
    
    let newValue = value;
    const step = e.shiftKey ? 10 : 1;
    
    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowRight':
        newValue = Math.min(100, value + step);
        break;
      case 'ArrowDown':
      case 'ArrowLeft':
        newValue = Math.max(0, value - step);
        break;
      case 'Home':
        newValue = 0;
        break;
      case 'End':
        newValue = 100;
        break;
      default:
        return;
    }
    
    e.preventDefault();
    onChange(newValue);
  }, [disabled, value, onChange]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  return (
    <div className={cn('flex flex-col items-center space-y-4', className)}>
      {label && (
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      
      <div
        ref={knobRef}
        className={cn(
          'relative cursor-pointer select-none transition-all duration-150',
          'volume-button-knob',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        style={{ 
          width: config.diameter,
          height: config.diameter,
          transform: `scale(${config.scale})`
        }}
        tabIndex={disabled ? -1 : 0}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onKeyDown={handleKeyDown}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-label={label || 'Volume control'}
      >
        <svg viewBox="0 0 600 600" className="w-full h-full">
          <defs>
            <radialGradient id={`radial-gradient-${color}`} cx="0.5" cy="0.5" r="0.5" gradientUnits="objectBoundingBox">
              <stop offset="0" stopColor="#202528" />
              <stop offset="0.849" stopColor="#272c2f" />
              <stop offset="0.866" stopColor="#6a6d6f" />
              <stop offset="0.87" stopColor="#202528" />
              <stop offset="0.879" stopColor="#6a6d6f" />
              <stop offset="0.908" stopColor="#202528" />
              <stop offset="1" stopColor="#6a6d6f" />
            </radialGradient>
            <filter id={`shadow-${color}`} filterUnits="userSpaceOnUse">
              <feOffset />
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feFlood result="color" />
              <feComposite operator="in" in="blur" />
              <feComposite in="SourceGraphic" />
            </filter>
            <filter id={`inset-shadow-${color}`}>
              <feOffset />
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feFlood result="color" />
              <feComposite operator="out" in="SourceGraphic" in2="blur" />
              <feComposite operator="in" in="color" />
              <feComposite operator="in" in2="SourceGraphic" />
            </filter>
          </defs>
          
          {/* Background circle */}
          <circle 
            className="circle" 
            cx="300" 
            cy="300" 
            r="200"
            fill={muted ? "#4a1a1a" : "#202528"}
            stroke={muted ? "#8b0000" : "#080516"}
            strokeWidth="10"
          />
          
          {/* Gradient lines */}
          <g ref={gradateGroupRef} className="gradate">
            {generateGradateLines()}
          </g>
          
          {/* Slider handle */}
          <g className="slider-wrap" style={{ filter: `url(#inset-shadow-${color})` }}>
            <circle 
              ref={sliderShadowRef}
              id="slider-shadow" 
              className="slider" 
              cx="300" 
              cy="130" 
              r="10"
              style={{
                '--deg': `${degrees}deg`,
                '--h': `${hue}`,
                '--s': '60%',
                transform: `rotate(${degrees}deg)`,
                transformOrigin: '50% 50%',
                fill: muted ? 'rgba(239, 68, 68, 0.5)' : `hsl(${hue}, 60%, 55%)`,
                cursor: 'grab',
                transition: isDragging ? 'unset' : 'all 0.1s ease-in-out'
              } as React.CSSProperties}
            />
          </g>
          
          <circle 
            ref={sliderRef}
            id="slider" 
            className="slider" 
            cx="300" 
            cy="130" 
            r="10"
            style={{
              '--deg': `${degrees}deg`,
              '--h': `${hue}`,
              '--s': '60%',
              transform: `rotate(${degrees}deg)`,
              transformOrigin: '50% 50%',
              fill: muted ? 'rgba(239, 68, 68, 0.5)' : `hsl(${hue}, 60%, 55%)`,
              cursor: 'grab',
              transition: isDragging ? 'unset' : 'all 0.1s ease-in-out'
            } as React.CSSProperties}
          />
        </svg>

        {/* Center percentage display */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className={cn(
              'font-bold',
              muted ? 'text-red-500' : 'text-white',
              size === 'small' ? 'text-lg' : size === 'medium' ? 'text-xl' : 'text-2xl'
            )}>
              {Math.round(value)}
            </div>
            <div className={cn(
              'text-gray-300',
              size === 'small' ? 'text-xs' : 'text-sm'
            )}>
              %
            </div>
          </div>
        </div>

        {/* Focus ring */}
        <div className={cn(
          'absolute inset-0 rounded-full ring-2 ring-opacity-0 transition-all duration-150',
          'focus-within:ring-primary-500 focus-within:ring-opacity-50'
        )} />
      </div>

      {/* Muted indicator */}
      {muted && (
        <div className="text-xs text-red-500 font-medium animate-pulse">
          Muted
        </div>
      )}
    </div>
  );
}