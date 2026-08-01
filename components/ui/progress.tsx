import * as React from "react";
import { cn } from "@/lib/utils";

const Progress = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value?: number; max?: number }
>(({ className, value = 0, max = 100, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative h-3 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800",
      className
    )}
    {...props}
  >
    <div
      className="h-full rounded-full bg-zinc-900 transition-all dark:bg-zinc-50"
      style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
    />
  </div>
));
Progress.displayName = "Progress";

export { Progress };
