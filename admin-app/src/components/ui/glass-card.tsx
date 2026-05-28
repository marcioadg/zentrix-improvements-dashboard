import * as React from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  intensity?: 'light' | 'medium' | 'heavy';
  float?: boolean;
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, intensity = 'medium', float = false, children, ...props }, ref) => {
    const intensityClasses = {
      light: "bg-background/80 dark:bg-foreground/80 backdrop-blur-md",
      medium: "bg-background/90 dark:bg-foreground/90 backdrop-blur-lg",
      heavy: "bg-background/95 dark:bg-foreground/95 backdrop-blur-xl",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-[6px] border border-border/50 shadow-none ring-1 ring-white/20 dark:ring-white/5",
          intensityClasses[intensity],
          float && "transition-all duration-300 hover:shadow-sm hover:-translate-y-1",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassCard.displayName = "GlassCard";

export { GlassCard };
