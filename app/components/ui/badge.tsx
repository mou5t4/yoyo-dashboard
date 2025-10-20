import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "~/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm",
  {
    variants: {
      variant: {
        default: "border-gray-300 dark:border-white/40 bg-gray-100 dark:bg-white/25 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-white/35 hover:shadow-md",
        secondary: "border-gray-300 dark:border-white/40 bg-gray-200 dark:bg-white/20 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-white/30",
        destructive: "border-red-300 dark:border-red-300/70 bg-red-100 dark:bg-red-500/50 text-red-900 dark:text-white hover:bg-red-200 dark:hover:bg-red-500/60 shadow-red-500/30",
        success: "border-emerald-300 dark:border-emerald-300/70 bg-emerald-100 dark:bg-emerald-500/50 text-emerald-900 dark:text-white shadow-emerald-500/30",
        warning: "border-amber-300 dark:border-amber-300/70 bg-amber-100 dark:bg-amber-500/50 text-amber-900 dark:text-white shadow-amber-500/30",
        outline: "text-gray-900 dark:text-white border-gray-300 dark:border-white/50 bg-transparent dark:bg-white/10 hover:bg-gray-100 dark:hover:bg-white/20",
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

