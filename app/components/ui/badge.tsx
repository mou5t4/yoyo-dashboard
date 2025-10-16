import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "~/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 glass-badge shadow-sm",
  {
    variants: {
      variant: {
        default: "border-white/40 bg-white/25 text-white hover:bg-white/35 hover:shadow-md",
        secondary: "border-white/40 bg-white/20 text-white hover:bg-white/30",
        destructive: "border-red-300/70 bg-red-500/50 text-white hover:bg-red-500/60 shadow-red-500/30",
        success: "border-emerald-300/70 bg-emerald-500/50 text-white shadow-emerald-500/30",
        warning: "border-amber-300/70 bg-amber-500/50 text-white shadow-amber-500/30",
        outline: "text-white border-white/50 bg-white/10 hover:bg-white/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

