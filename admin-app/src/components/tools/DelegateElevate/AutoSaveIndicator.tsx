
import React from "react";
import { CheckCircle, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AutoSaveIndicatorProps {
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  className?: string;
}

export default function AutoSaveIndicator({
  hasUnsavedChanges,
  isSaving,
  className
}: AutoSaveIndicatorProps) {
  if (isSaving) {
    return (
      <div className={cn("flex items-center gap-1 text-xs text-muted-foreground", className)}>
        <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full" />
        <span>Auto-saving...</span>
      </div>
    );
  }

  if (hasUnsavedChanges) {
    return (
      <div className={cn("flex items-center gap-1 text-xs text-amber-600", className)}>
        <Clock className="w-3 h-3" />
        <span>Unsaved changes</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-1 text-xs text-success", className)}>
      <CheckCircle className="w-3 h-3" />
      <span>All changes saved</span>
    </div>
  );
}
