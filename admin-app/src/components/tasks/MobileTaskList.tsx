import React, { useState, useMemo, lazy, Suspense } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Clock, 
  Archive,
  ListTodo,
  CheckCircle2,
  Check,
  Undo2
} from 'lucide-react';
import { format } from 'date-fns';
import type { FastTask } from '@/hooks/useFastTasks';
import { useProfiles } from '@/hooks/useProfiles';
import { MobileCard, MobileEmptyState } from '@/components/mobile';
import { SwipeableCard } from '@/components/ui/swipeable-card';
import { useToast } from '@/hooks/use-toast';
import { getInitials } from '@/lib/utils';

// Lazy load edit modal - Step 4 optimization (use mobile-specific modal)
const MobileEditFastTaskModal = lazy(() => import('@/components/mobile/modals/MobileEditFastTaskModal').then(module => ({ default: module.MobileEditFastTaskModal })));

interface TeamInfo {
  id: string;
  name: string;
  company_id: string;
}

interface MobileTaskListProps {
  tasks: FastTask[];
  onStatusChange: (taskId: string, status: 'todo' | 'in-progress' | 'done') => Promise<void>;
  onArchive: (taskId: string) => Promise<void>;
  onUpdateTask?: (taskId: string, updates: Partial<FastTask>) => Promise<void>;
  teams: TeamInfo[];
  emptyMessage: string;
}

export const MobileTaskList: React.FC<MobileTaskListProps> = ({
  tasks,
  onStatusChange,
  onArchive,
  onUpdateTask,
  teams,
  emptyMessage = 'No tasks found'
}) => {
  const [editingTask, setEditingTask] = useState<FastTask | null>(null);
  const { profiles } = useProfiles();
  const { toast } = useToast();

  // Virtual scrolling configuration - Step 3 optimization
  const ITEM_HEIGHT = 120; // Approximate height per task card
  const BUFFER_SIZE = 5; // Extra items to render
  const VIRTUALIZATION_THRESHOLD = 50; // Enable virtualization for 50+ items
  const CONTAINER_HEIGHT = 600; // Fixed container height for calculations
  
  // Simple virtualization for large task lists
  const shouldVirtualize = useMemo(() => tasks.length > VIRTUALIZATION_THRESHOLD, [tasks.length]);
  const [scrollTop, setScrollTop] = useState(0);

  // Calculate visible range
  const startIndex = shouldVirtualize 
    ? Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER_SIZE)
    : 0;
  const endIndex = shouldVirtualize 
    ? Math.min(tasks.length - 1, Math.ceil((scrollTop + CONTAINER_HEIGHT) / ITEM_HEIGHT) + BUFFER_SIZE)
    : tasks.length - 1;

  const visibleTasks = shouldVirtualize ? tasks.slice(startIndex, endIndex + 1) : tasks;
  const totalHeight = shouldVirtualize ? tasks.length * ITEM_HEIGHT : 'auto';
  const offsetY = shouldVirtualize ? startIndex * ITEM_HEIGHT : 0;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (shouldVirtualize) {
      setScrollTop(e.currentTarget.scrollTop);
    }
  };

  const getStatusIcon = (status: string, task: FastTask) => {
    const isCompleted = status === 'done';
    const isInProgress = status === 'in-progress';
    
    if (isInProgress) {
      return (
        <div className="relative">
          <Checkbox 
            checked={false}
            onCheckedChange={() => onStatusChange(task.id, 'done')}
            className="mt-0.5"
          />
          <Clock className="absolute top-0.5 left-0.5 h-2 w-2 text-orange-500 pointer-events-none" />
        </div>
      );
    }
    
    return (
      <Checkbox 
        checked={isCompleted} 
        onCheckedChange={() => onStatusChange(task.id, isCompleted ? 'todo' : 'done')}
        className="mt-0.5"
      />
    );
  };

  const handleCompleteTask = async (task: FastTask) => {
    const previousStatus = task.status;
    
    await onStatusChange(task.id, 'done');
    
    toast({
      title: "Task completed",
      description: task.title,
      action: {
        label: "Undo",
        onClick: async () => {
          await onStatusChange(task.id, previousStatus as 'todo' | 'in-progress' | 'done');
        }
      }
    });
  };

  const handleArchiveTask = async (task: FastTask) => {
    await onArchive(task.id);
    toast({
      title: "Task archived",
      description: task.title,
    });
  };

  // Get appropriate icon and message based on empty message context
  const getEmptyStateConfig = () => {
    if (emptyMessage.toLowerCase().includes('completed') || emptyMessage.toLowerCase().includes('done')) {
      return { icon: CheckCircle2, title: 'No completed tasks', description: 'Complete tasks to see them here' };
    }
    if (emptyMessage.toLowerCase().includes('progress')) {
      return { icon: Clock, title: 'No tasks in progress', description: 'Start working on a task' };
    }
    return { icon: ListTodo, title: 'No pending tasks', description: 'Add a task to get started' };
  };

  if (tasks.length === 0) {
    const config = getEmptyStateConfig();
    return (
      <MobileEmptyState
        icon={config.icon}
        title={config.title}
        description={config.description}
      />
    );
  }

  // TaskItem component extracted for cleaner code - description hidden by default
  const TaskItem: React.FC<{ task: FastTask }> = ({ task }) => {
    const isCompleted = task.status === 'done';
    const ownerId = task.assignedTo?.[0];
    const ownerProfile = ownerId ? profiles.find(p => p.id === ownerId) : null;
    const initials = getInitials(ownerProfile?.full_name);
    
    return (
      <SwipeableCard
        leftAction={{
          icon: isCompleted ? <Undo2 className="h-5 w-5" /> : <Check className="h-5 w-5" />,
          label: isCompleted ? 'Undo' : 'Complete',
          color: 'bg-green-500',
          onAction: () => {
            if (isCompleted) {
              onStatusChange(task.id, 'todo');
            } else {
              handleCompleteTask(task);
            }
          }
        }}
        rightAction={{
          icon: <Archive className="h-5 w-5" />,
          label: 'Archive',
          color: 'bg-status-warning',
          onAction: () => handleArchiveTask(task)
        }}
      >
        <MobileCard 
          interactive
          onClick={() => setEditingTask(task)}
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5" onClick={(e) => e.stopPropagation()}>
              {getStatusIcon(task.status, task)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium text-sm leading-tight break-words line-clamp-2 flex-1">
                  {task.title}
                </h3>
                
                {/* Date and avatar on right */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {task.dueDate && (
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(task.dueDate), 'MMM d')}
                    </span>
                  )}
                  
                  {ownerId && (ownerProfile?.avatar_url || initials) && (
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={ownerProfile?.avatar_url || undefined} />
                      {initials && (
                        <AvatarFallback className="text-[10px] bg-muted">
                          {initials}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  )}
                </div>
              </div>
            </div>
          </div>
        </MobileCard>
      </SwipeableCard>
    );
  };

  return (
    <>
      {shouldVirtualize ? (
        <div 
          className="h-full overflow-auto pb-4"
          onScroll={handleScroll}
        >
          <div style={{ height: totalHeight, position: 'relative' }}>
            <div
              style={{
                transform: `translateY(${offsetY}px)`,
                position: 'absolute',
                width: '100%',
              }}
            >
              <div className="space-y-3">
                {visibleTasks.map((task) => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3 pb-4 h-full overflow-auto">
          {visibleTasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && onUpdateTask && (
        <Suspense fallback={<div />}>
          <MobileEditFastTaskModal
            open={!!editingTask}
            onOpenChange={(open) => !open && setEditingTask(null)}
            task={editingTask}
            onUpdate={onUpdateTask}
            teams={teams}
          />
        </Suspense>
      )}
    </>
  );
};
