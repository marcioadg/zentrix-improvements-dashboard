
export interface KanbanTask {
  id: string;
  user_id?: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done';
  source: 'manual' | 'feedback-widget';
  assigned_to: string[]; // Array of UUIDs for multiple assignees (unified column)
  is_archived: boolean;
  archived_at?: string;
  order_position?: number;
  image_url?: string;
  due_date?: string;
  team_id?: string;
  task_type: 'product' | 'personal' | 'team';
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export type TaskStatus = 'todo' | 'in-progress' | 'done';

// Removed TaskPriority type entirely
