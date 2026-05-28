
import { TaskStatus } from '@/types/kanban';

export interface UnifiedKanbanTask {
  id: string;
  user_id?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  source: 'manual' | 'feedback-widget';
  assigned_to: string[]; // Array of UUIDs for multiple assignees (unified column)
  is_archived: boolean;
  archived_at?: string;
  is_deleted?: boolean; // New: soft delete flag
  deleted_at?: string; // New: soft delete timestamp
  order_position?: number;
  image_url?: string;
  due_date?: string;
  team_id?: string;
  task_type: 'product' | 'personal' | 'team';
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface UnifiedTeamTask {
  id: string;
  title: string;
  description?: string;
  team_id: string;
  assigned_to: string[]; // Array of UUIDs for multiple assignees (unified column)
  due_date?: string;
  completed: boolean;
  archived: boolean;
  is_deleted?: boolean; // New: soft delete flag
  deleted_at?: string; // New: soft delete timestamp
  created_at: string;
  updated_at: string;
}

export interface UnifiedAllTask {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  source: 'manual' | 'feedback-widget';
  assigned_to: string[]; // Array of UUIDs for multiple assignees (unified column)
  is_archived: boolean;
  archived_at?: string;
  is_deleted?: boolean; // New: soft delete flag
  deleted_at?: string; // New: soft delete timestamp
  order_position?: number;
  image_url?: string;
  due_date?: string;
  team_id?: string;
  task_type: 'product' | 'personal' | 'team';
  user_id?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  source_label: string;
}
