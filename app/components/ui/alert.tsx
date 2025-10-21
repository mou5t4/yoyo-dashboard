import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "~/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-xl border-2 p-3 backdrop-blur-md shadow-lg [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-5 [&>svg]:top-3 border-l-4",
  {
    variants: {
      variant: {
        default: "glass border-white/40 border-l-blue-400 text-white [&>svg]:text-blue-300 shadow-blue-500/20",
        destructive:
          "bg-red-500/30 border-red-300/60 border-l-red-400 text-white [&>svg]:text-red-200 shadow-red-500/30",
        success:
          "bg-emerald-500/30 border-emerald-300/60 border-l-emerald-400 text-white [&>svg]:text-emerald-200 shadow-emerald-500/30",
        warning:
          "bg-amber-500/30 border-amber-300/60 border-l-amber-400 text-white [&>svg]:text-amber-200 shadow-amber-500/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };

