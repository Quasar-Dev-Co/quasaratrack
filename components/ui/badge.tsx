import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent text-white",
        secondary:
          "border-transparent bg-muted text-muted-foreground",
        destructive:
          "border-transparent text-white",
        outline:
          "border-border text-foreground",
        success:
          "border-transparent text-white",
        warning:
          "border-transparent text-zinc-900",
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
  const style: React.CSSProperties = {};
  if (variant === "default") {
    style.background = "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)";
  } else if (variant === "success") {
    style.background = "rgba(52, 211, 153, 0.15)";
    style.color = "#34d399";
    style.border = "1px solid rgba(52, 211, 153, 0.25)";
  } else if (variant === "warning") {
    style.background = "rgba(251, 191, 36, 0.15)";
    style.color = "#fbbf24";
    style.border = "1px solid rgba(251, 191, 36, 0.25)";
  } else if (variant === "destructive") {
    style.background = "rgba(248, 113, 113, 0.15)";
    style.color = "#f87171";
    style.border = "1px solid rgba(248, 113, 113, 0.25)";
  }
  return <div className={cn(badgeVariants({ variant }), className)} style={style} {...props} />;
}

export { Badge, badgeVariants };
