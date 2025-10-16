import * as React from "react";
import { cn } from "~/lib/utils";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          className={cn(
            "flex h-10 w-full rounded-xl border-2 border-white/40 glass-input px-4 py-2 text-sm font-medium text-white",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-0 focus-visible:border-white/70 focus-visible:bg-white/25",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "appearance-none cursor-pointer transition-all duration-300 shadow-lg",
            "pr-10 hover:shadow-xl hover:border-white/50",
            "leading-tight",
            className
          )}
          style={{
            colorScheme: 'dark',
            textShadow: '0 1px 2px rgba(0,0,0,0.3)',
          }}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    );
  }
);

Select.displayName = "Select";

export { Select };




