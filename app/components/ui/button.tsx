import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "~/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation active:scale-[0.97] relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "glass text-white hover:bg-white/25 active:bg-white/30 shadow-lg hover:shadow-2xl hover:shadow-purple-500/20 hover:-translate-y-0.5 high-contrast-white",
        destructive: "bg-red-500/80 backdrop-blur-md text-white hover:bg-red-600/80 active:bg-red-700/80 border-2 border-red-300/40 shadow-lg hover:shadow-xl hover:shadow-red-500/30 hover:-translate-y-0.5 high-contrast-white",
        outline: "border-2 border-white/40 glass text-white hover:bg-white/20 hover:border-white/60 active:bg-white/25 shadow-md hover:shadow-lg hover:-translate-y-0.5 high-contrast-white",
        secondary: "bg-white/20 backdrop-blur-md text-white hover:bg-white/30 active:bg-white/35 border-2 border-white/30 shadow-md hover:shadow-lg hover:-translate-y-0.5 high-contrast-white",
        ghost: "hover:bg-white/20 text-white active:bg-white/25 hover:-translate-y-0.5 high-contrast-white",
        link: "text-white underline-offset-4 hover:underline active:text-white/80 high-contrast-white",
        success: "bg-emerald-500/80 backdrop-blur-md text-white hover:bg-emerald-600/80 active:bg-emerald-700/80 border-2 border-emerald-300/40 shadow-lg hover:shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-0.5 high-contrast-white",
        warning: "bg-amber-500/80 backdrop-blur-md text-white hover:bg-amber-600/80 active:bg-amber-700/80 border-2 border-amber-300/40 shadow-lg hover:shadow-xl hover:shadow-amber-500/30 hover:-translate-y-0.5 high-contrast-white",
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

