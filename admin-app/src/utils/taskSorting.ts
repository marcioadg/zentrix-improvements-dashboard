import { UnifiedKanbanTask } from '@/types/tasks';

interface SortPreferences {
  sortBy: 'due_date' | 'created_at' | 'priority';
  sortOrder: 'asc' | 'desc';
}

export const sortTasks = (tasks: UnifiedKanbanTask[], preferences: SortPreferences): UnifiedKanbanTask[] => {
  return [...tasks].sort((a, b) => {
    let comparison = 0;

    switch (preferences.sortBy) {
      case 'due_date':
        // Handle null/undefined due dates - put them at the end
        if (!a.due_date && !b.due_date) comparison = 0;
        else if (!a.due_date) comparison = 1;
        else if (!b.due_date) comparison = -1;
        else comparison = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        break;

      case 'created_at':
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;

      case 'priority': {
        const order: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
        comparison = (order[(a as any).priority] ?? 99) - (order[(b as any).priority] ?? 99);
        break;
      }

      default:
        comparison = 0;
    }

    return preferences.sortOrder === 'desc' ? -comparison : comparison;
  });
};
