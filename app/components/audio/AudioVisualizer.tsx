import React, { useRef, useEffect, useState } from 'react';
import { cn } from '~/lib/utils';

interface AudioVisualizerProps {
  active: boolean;
  type?: 'wave' | 'bars' | 'circle';
  height?: number;
  color?: string;
  className?: string;
}

export function AudioVisualizer({
  active,
  type = 'wave',
  height = 80,
  color = '#3b82f6',
  className
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (active && !isVisible) {
      setIsVisible(true);
    } else if (!active && isVisible) {
      // Delay hiding to allow fade out animation
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [active, isVisible]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isVisible) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let animationTime = 0;

    const animate = () => {
      if (!isVisible || !active) {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const canvasHeight = rect.height;

      // Clear canvas
      ctx.clearRect(0, 0, width, canvasHeight);

      // Set drawing properties
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;

      animationTime += 0.05;

      if (type === 'wave') {
        drawWave(ctx, width, canvasHeight, animationTime, color);
      } else if (type === 'bars') {
        drawBars(ctx, width, canvasHeight, animationTime, color);
      } else if (type === 'circle') {
        drawCircle(ctx, width, canvasHeight, animationTime, color);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isVisible, active, type, color]);

  const drawWave = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number,
    color: string
  ) => {
    const centerY = height / 2;
    const amplitude = height * 0.3;
    const frequency = 0.02;
    const points: { x: number; y: number }[] = [];

    // Generate wave points
    for (let x = 0; x <= width; x += 2) {
      const y = centerY + Math.sin(x * frequency + time) * amplitude;
      points.push({ x, y });
    }

    // Draw wave
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    
    ctx.stroke();

    // Add gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, color + '40'); // 25% opacity
    gradient.addColorStop(1, color + '00'); // 0% opacity

    ctx.fillStyle = gradient;
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();
  };

  const drawBars = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number,
    color: string
  ) => {
    const barCount = Math.floor(width / 8);
    const barWidth = width / barCount * 0.6;
    const barSpacing = width / barCount;

    for (let i = 0; i < barCount; i++) {
      const x = i * barSpacing + (barSpacing - barWidth) / 2;
      
      // Create varying bar heights with animation
      const baseHeight = Math.random() * height * 0.8;
      const animationOffset = Math.sin(time * 2 + i * 0.3) * height * 0.1;
      const barHeight = Math.max(2, baseHeight + animationOffset);
      
      const y = height - barHeight;

      // Create gradient for each bar
      const gradient = ctx.createLinearGradient(0, y, 0, height);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, color + '60'); // 37% opacity

      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, barHeight);
    }
  };

  const drawCircle = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number,
    color: string
  ) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) / 2 - 10;

    // Draw multiple expanding circles
    for (let i = 0; i < 3; i++) {
      const radius = (Math.sin(time * 2 + i * 2) * 0.5 + 0.5) * maxRadius;
      const opacity = Math.sin(time * 2 + i * 2) * 0.3 + 0.3;
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.strokeStyle = color + Math.floor(opacity * 255).toString(16).padStart(2, '0');
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg transition-all duration-300',
        active ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
        className
      )}
      style={{ height }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ height }}
      />
      
      {/* Overlay gradient for better visibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
    </div>
  );
}

// Wave animation component for simpler use cases
export function WaveAnimation({ 
  active, 
  className 
}: { 
  active: boolean; 
  className?: string; 
}) {
  return (
    <div className={cn(
      'flex items-center justify-center space-x-1 h-8',
      className
    )}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'bg-blue-500 rounded-full transition-all duration-300',
            active ? 'animate-wave' : 'animate-none'
          )}
          style={{
            width: '4px',
            height: active ? `${16 + Math.sin(Date.now() * 0.01 + i) * 8}px` : '4px',
            animationDelay: `${i * 0.1}s`
          }}
        />
      ))}
    </div>
  );
}
