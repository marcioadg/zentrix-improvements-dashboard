import * as React from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { useMetricValueNote } from "@/hooks/useMetricValueNote";

import { WeeklyMetricWithOwner } from "@/types/weeklyMetrics";

interface Props {
  metricId: string;
  teamId: string;
  weekStart: string;
  metric?: WeeklyMetricWithOwner;
  defaultOpen?: boolean;
  onClose?: () => void;
  onOptimisticCellUpdate?: (metricId: string, weekStart: string, patch: { custom_target_value?: number | null; target_note?: string | null }) => void;
}

export const MetricValueNoteButton: React.FC<Props> = ({ metricId, teamId, weekStart, metric, defaultOpen = false, onClose, onOptimisticCellUpdate }) => {
  const [open, setOpen] = React.useState(defaultOpen);
  
  const { note, hasNote, isLoading, isSaving, save } = useMetricValueNote(
    metricId, 
    teamId, 
    weekStart, 
    true,
    undefined,
    metric,
    onOptimisticCellUpdate
  );
  
  const [text, setText] = React.useState("");

  React.useEffect(() => {
    if (open) setText(note ?? "");
  }, [open, note]);
  
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen && onClose) {
      onClose();
    }
  };

  const onSave = async () => {
    await save(text);
    handleOpenChange(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <TooltipProvider delayDuration={300}>
        <Tooltip open={hasNote && !open ? undefined : false}>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-3 w-3 p-0 hover:bg-transparent rounded-none transition-all focus-visible:opacity-100 focus-visible:ring-0 ${hasNote ? 'opacity-60' : 'opacity-0 group-hover/cell:opacity-40'} transition-opacity duration-200`}
                  onClick={(e) => { e.stopPropagation(); }}
                  onPointerDown={(e) => { e.stopPropagation(); }}
                  aria-label={hasNote ? "Edit note" : "Add note"}
                >
                  <MessageCircle className="h-2.5 w-2.5 text-muted-foreground" strokeWidth={1.5} />
                </Button>
              </PopoverTrigger>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[240px] whitespace-pre-wrap">
            {note}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent align="end" className="z-50 bg-popover text-popover-foreground border shadow-md p-3 w-72" onKeyDown={(e) => e.stopPropagation()}>
        <div className="space-y-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSave();
              }
            }}
            placeholder="Add a quick note about this value..."
            className="min-h-24"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{isLoading ? "Loading..." : isSaving ? "Saving..." : hasNote ? "Note saved" : "No note yet"}</span>
            <div className="space-x-2">
              <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)}>Cancel</Button>
              <Button size="sm" onClick={onSave} disabled={isSaving}>Save</Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
