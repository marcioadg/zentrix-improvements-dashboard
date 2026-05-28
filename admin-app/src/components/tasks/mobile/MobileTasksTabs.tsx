import React, { useState } from 'react';
import { Archive } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskCounts {
  todo: number;
  inprogress: number;
  done: number;
  total: number;
}

interface MobileTasksTabsProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  taskCounts: TaskCounts;
  showArchived: boolean;
  onToggleArchived: (value: boolean) => void;
}

export const MobileTasksTabs: React.FC<MobileTasksTabsProps> = ({
  activeTab,
  onTabChange,
  taskCounts,
  showArchived,
  onToggleArchived,
}) => {
  const [pressedTab, setPressedTab] = useState<string | null>(null);
  const [archivePressed, setArchivePressed] = useState(false);

  const tabs = [
    { id: 'todo', label: 'To Do', count: taskCounts.todo },
    { id: 'done', label: 'Done', count: taskCounts.done },
  ];

  const activeIndex = tabs.findIndex(t => t.id === activeTab);

  return (
    <div className="px-4 pb-2 pt-1">
      <div className="flex items-center justify-between gap-3">
        {/* Segmented tabs with sliding indicator - matching MobileSegmentedControl */}
        <div className="relative flex p-1 bg-muted/60 rounded-[6px] gap-1 flex-1">
          {/* Elevated sliding background */}
          <div
            className="absolute top-1 bottom-1 bg-background rounded-[4px] shadow-md transition-all duration-200 ease-out"
            style={{
              left: `calc(${activeIndex * 50}% + 4px)`,
              width: `calc(50% - 8px)`,
            }}
          />

          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const isPressed = pressedTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                onTouchStart={() => setPressedTab(tab.id)}
                onTouchEnd={() => setPressedTab(null)}
                onTouchCancel={() => setPressedTab(null)}
                onMouseDown={() => setPressedTab(tab.id)}
                onMouseUp={() => setPressedTab(null)}
                onMouseLeave={() => setPressedTab(null)}
                className={cn(
                  "relative z-10 flex-1 py-2 px-3 rounded-[4px] text-sm",
                  "transition-all duration-150 ease-out",
                  "flex items-center justify-center gap-1.5",
                  "touch-manipulation select-none",
                  isActive
                    ? "text-foreground font-bold"
                    : "text-muted-foreground font-semibold hover:text-foreground/80",
                  isPressed && "scale-[0.96] opacity-80"
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "text-xs font-bold px-2 py-0.5 rounded-[4px] min-w-[22px] text-center",
                    "transition-all duration-200",
                    isActive
                      ? "bg-[var(--active)]/10 text-[var(--active)]"
                      : "bg-muted-foreground/15 text-muted-foreground"
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Archive toggle with press feedback */}
        <button
          onClick={() => onToggleArchived(!showArchived)}
          onTouchStart={() => setArchivePressed(true)}
          onTouchEnd={() => setArchivePressed(false)}
          onTouchCancel={() => setArchivePressed(false)}
          onMouseDown={() => setArchivePressed(true)}
          onMouseUp={() => setArchivePressed(false)}
          onMouseLeave={() => setArchivePressed(false)}
          className={cn(
            "h-9 w-9 rounded-[6px] flex items-center justify-center",
            "transition-all duration-100 ease-out",
            "touch-manipulation select-none",
            showArchived
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:bg-muted",
            archivePressed && "scale-[0.92] opacity-80"
          )}
          aria-label={showArchived ? "Hide archived" : "Show archived"}
        >
          <Archive className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
