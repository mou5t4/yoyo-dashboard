import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "~/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation active:scale-[0.97] relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-blue-600 dark:bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-700 active:bg-blue-800 dark:active:bg-blue-800 shadow-lg hover:shadow-xl hover:-translate-y-0.5",
        destructive: "bg-red-600 dark:bg-red-500/80 text-white hover:bg-red-700 dark:hover:bg-red-600/80 active:bg-red-800 dark:active:bg-red-700/80 border-2 border-red-300/40 shadow-lg hover:shadow-xl hover:-translate-y-0.5",
        outline: "border-2 border-gray-300 dark:border-white/40 bg-transparent text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/20 hover:border-gray-400 dark:hover:border-white/60 active:bg-gray-200 dark:active:bg-white/25 shadow-md hover:shadow-lg hover:-translate-y-0.5",
        secondary: "bg-gray-200 dark:bg-white/20 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-white/30 active:bg-gray-400 dark:active:bg-white/35 border-2 border-gray-300 dark:border-white/30 shadow-md hover:shadow-lg hover:-translate-y-0.5",
        ghost: "hover:bg-gray-100 dark:hover:bg-white/20 text-gray-900 dark:text-white active:bg-gray-200 dark:active:bg-white/25 hover:-translate-y-0.5",
        link: "text-blue-600 dark:text-white underline-offset-4 hover:underline active:text-blue-700 dark:active:text-white/95",
        success: "bg-emerald-600 dark:bg-emerald-500/80 text-white hover:bg-emerald-700 dark:hover:bg-emerald-600/80 active:bg-emerald-800 dark:active:bg-emerald-700/80 border-2 border-emerald-300/40 shadow-lg hover:shadow-xl hover:-translate-y-0.5",
        warning: "bg-amber-600 dark:bg-amber-500/80 text-white hover:bg-amber-700 dark:hover:bg-amber-600/80 active:bg-amber-800 dark:active:bg-amber-700/80 border-2 border-amber-300/40 shadow-lg hover:shadow-xl hover:-translate-y-0.5",
      },
      size: {
        default: "h-11 px-6 py-2.5 min-h-[44px] text-sm",
        sm: "h-9 rounded-lg px-4 text-xs",
        lg: "h-13 rounded-xl px-8 text-base min-h-[52px] font-bold",
        icon: "h-11 w-11 min-h-[44px] min-w-[44px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

