import * as React from "react";
import { cn } from "~/lib/utils";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    
    // Determine color based on percentage
    const getProgressColor = () => {
      if (percentage < 20) return 'from-red-400 to-red-500';
      if (percentage < 50) return 'from-amber-400 to-orange-500';
      if (percentage < 75) return 'from-blue-400 to-cyan-500';
      return 'from-emerald-400 to-green-500';
    };

    return (
      <div
        ref={ref}
        className={cn(
          "relative h-4 w-full overflow-hidden rounded-full glass border-2 border-white/30 shadow-inner",
          className
        )}
        {...props}
      >
        <div
          className={cn(
            "h-full w-full flex-1 bg-gradient-to-r transition-all duration-500 shadow-lg relative",
            getProgressColor()
          )}
          style={{ 
            transform: `translateX(-${100 - percentage}%)`,
            boxShadow: '0 0 12px rgba(255, 255, 255, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.3)'
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
        </div>
      </div>
    );
  }
);
Progress.displayName = "Progress";

export { Progress };

