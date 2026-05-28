
import React from "react";
import { cn } from "@/lib/utils";

export const LoadingSkeleton: React.FC<{ message?: string; className?: string }> = ({
  message = "Loading...",
  className,
}) => (
  <div className={cn("flex flex-col items-center justify-center py-12 w-full", className)}>
    <div className="bg-muted/60 skeleton-shimmer rounded-full h-10 w-10 mb-4" />
    <div className="h-4 bg-muted/60 skeleton-shimmer rounded w-1/3 mb-2" />
    <div className="h-4 bg-muted/60 skeleton-shimmer rounded w-1/4 mb-4" />
    <span className="text-sm text-muted-foreground opacity-60">{message}</span>
  </div>
);
