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
            "flex h-10 w-full rounded-xl border-2 border-gray-300 dark:border-white/40 bg-white dark:bg-gray-700/50 px-4 py-2 text-sm font-medium text-gray-900 dark:text-white",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:border-blue-400 focus-visible:bg-gray-50 dark:focus-visible:bg-white/25",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "appearance-none cursor-pointer transition-all duration-300 shadow-md",
            "pr-10 hover:shadow-lg hover:border-gray-400 dark:hover:border-white/50",
            "leading-tight",
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg className="w-4 h-4 text-gray-700 dark:text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    );
  }
);

Select.displayName = "Select";

export { Select };




