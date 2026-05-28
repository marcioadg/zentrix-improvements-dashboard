
import { UnifiedKanbanTask } from '@/types/tasks';
import { TaskStatus } from '@/types/kanban';

export interface UseUnifiedKanbanTasksProps {
  selectedTeamIds: string[];
}

export interface UseUnifiedKanbanTasksReturn {
  tasks: UnifiedKanbanTask[];
  loading: boolean;
  addTask: (
    title: string, 
    description: string, 
    teamSelection: { type: 'personal' | 'team'; teamId?: string },
    status?: 'todo' | 'in-progress' | 'done',
    assignedTo?: string[]
  ) => Promise<UnifiedKanbanTask>;
  updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<boolean>;
  updateTask: (taskId: string, updates: Partial<UnifiedKanbanTask>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  pendingArchives: Array<{ taskId: string; title: string; timeLeft: number }>;
  undoArchive: (taskId: string) => void;
  refetch: () => Promise<void>;
}
