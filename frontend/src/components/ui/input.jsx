import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const Input = forwardRef(({ className, type = "text", ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      "flex h-10 w-full rounded-xl border border-input bg-white/60 dark:bg-white/5 px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 backdrop-blur",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
