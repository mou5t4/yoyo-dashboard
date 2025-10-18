import * as React from "react";
import { cn } from "~/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
            className={cn(
              "flex h-11 w-full rounded-lg border-2 border-gray-300 dark:border-white/30 bg-white dark:bg-gray-700/50 px-4 py-2.5 text-base md:text-sm text-gray-900 dark:text-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 dark:placeholder:text-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:border-blue-400 focus-visible:bg-gray-50 dark:focus-visible:bg-white/25 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 min-h-[44px] touch-manipulation",
              className
            )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };

