
import React from "react";
import { Button } from "@/components/ui/button";

type Props = {
  pageIndex: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
  onMarkComplete: () => void;
  onUnmarkComplete?: () => void;
  isCompleted: boolean;
  isMarking: boolean;
  showMarkComplete: boolean;
};

const ProcessNavigationBar: React.FC<Props> = ({
  pageIndex,
  totalPages,
  onPrev,
  onNext,
  canPrev,
  canNext,
  onMarkComplete,
  onUnmarkComplete,
  isCompleted,
  isMarking,
  showMarkComplete,
}) => {
  return (
    <nav className="flex items-center justify-between bg-muted/30 rounded px-4 py-2 mt-4 gap-2">
      <Button
        variant="outline"
        onClick={onPrev}
        disabled={!canPrev}
        className="min-w-[80px]"
        tabIndex={canPrev ? 0 : -1}
      >
        Back
      </Button>
      <div className="flex-1 text-center text-muted-foreground font-semibold">
        Page {pageIndex + 1} of {totalPages}
      </div>
      <Button
        variant="outline"
        onClick={onNext}
        disabled={!canNext}
        className="min-w-[80px]"
        tabIndex={canNext ? 0 : -1}
      >
        Next
      </Button>
      {showMarkComplete && (
        <div className="flex items-center gap-2 ml-4">
          <Button
            type="button"
            size="sm"
            variant={isCompleted ? "secondary" : "default"}
            disabled={isMarking}
            onClick={isCompleted ? onUnmarkComplete : onMarkComplete}
            className="transition"
          >
            {isCompleted ? "Completed" : "Mark as Complete"}
          </Button>
        </div>
      )}
    </nav>
  );
};

export default ProcessNavigationBar;
