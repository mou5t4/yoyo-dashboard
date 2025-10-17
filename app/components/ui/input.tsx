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
              "flex h-11 w-full rounded-lg border-2 border-white/30 glass px-4 py-2.5 text-base md:text-sm text-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:border-blue-400 focus-visible:bg-white/25 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 min-h-[44px] touch-manipulation high-contrast-white",
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

