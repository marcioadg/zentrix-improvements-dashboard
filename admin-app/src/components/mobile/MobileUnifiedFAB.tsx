import React, { useState } from 'react';
import { 
  Plus, 
  X, 
  CheckSquare, 
  MessageCircleQuestion, 
  Target, 
  TrendingUp, 
  Newspaper 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileUnifiedFABProps {
  onAddTask: () => void;
  onAddIssue: () => void;
  onAddGoal: () => void;
  onAddMetric: () => void;
  onAddHeadline: () => void;
}

// Each entity gets its own brand colour so the tile colour alone identifies
// the action. All five colours come from the design-system tokens (no raw
// hex / arbitrary tailwind classes), so dark mode + theming carry through.
const fabItems = [
  { id: 'issue', label: 'Issue', icon: MessageCircleQuestion, color: 'bg-warning' },
  { id: 'headline', label: 'Headline', icon: Newspaper, color: 'bg-chart-1' },
  { id: 'task', label: 'Task', icon: CheckSquare, color: 'bg-primary' },
  { id: 'goal', label: 'Goal', icon: Target, color: 'bg-success' },
  { id: 'metric', label: 'Metric', icon: TrendingUp, color: 'bg-chart-3' },
];

/**
 * Unified mobile FAB with consistent options across all /m pages
 * - Expands to show all creation options
 * - Smooth animations with staggered reveal
 * - Backdrop blur when expanded
 */
export const MobileUnifiedFAB: React.FC<MobileUnifiedFABProps> = ({
  onAddTask,
  onAddIssue,
  onAddGoal,
  onAddMetric,
  onAddHeadline,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pressedItem, setPressedItem] = useState<string | null>(null);

  const handleAction = (id: string) => {
    switch (id) {
      case 'task':
        onAddTask();
        break;
      case 'issue':
        onAddIssue();
        break;
      case 'goal':
        onAddGoal();
        break;
      case 'metric':
        onAddMetric();
        break;
      case 'headline':
        onAddHeadline();
        break;
    }
    setIsOpen(false);
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40 animate-fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* FAB Container - positioned above bottom nav */}
      <div className="fixed bottom-20 right-4 z-50 flex flex-col-reverse items-end gap-3 pb-[env(safe-area-inset-bottom)]">
        {/* Action items - appear when expanded */}
        {isOpen && fabItems.map((item, index) => {
          const Icon = item.icon;
          const isPressed = pressedItem === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => handleAction(item.id)}
              onTouchStart={() => setPressedItem(item.id)}
              onTouchEnd={() => setPressedItem(null)}
              onTouchCancel={() => setPressedItem(null)}
              className={cn(
                "flex items-center gap-3 pl-4 pr-5 h-12 rounded-full",
                "bg-card border border-border/50 shadow-lg",
                "transition-all duration-150 ease-out",
                "touch-manipulation select-none",
                "animate-scale-in",
                isPressed && "scale-95 opacity-90"
              )}
              style={{ 
                animationDelay: `${index * 40}ms`,
                animationFillMode: 'backwards'
              }}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center",
                item.color
              )}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-foreground">
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Main FAB button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center",
            "text-white shadow-xl",
            "transition-all duration-200 ease-out",
            "touch-manipulation select-none",
            "hover:shadow-2xl hover:scale-105",
            "active:scale-95",
            isOpen && "rotate-45 !bg-muted text-muted-foreground shadow-lg"
          )}
          style={!isOpen ? { background: 'var(--btn-bg, hsl(var(--primary)))' } : undefined}
        >
          {isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Plus className="h-6 w-6" />
          )}
        </button>
      </div>
    </>
  );
};
