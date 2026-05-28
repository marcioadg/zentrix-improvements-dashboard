
export interface FastTask {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'done';
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  taskType: 'personal' | 'team';
  teamId?: string;
  teamName?: string;
  assignedTo?: string[]; // Changed to array to match database
  assignedToAvatarUrl?: string; // Primary assignee avatar
  ownerAvatarUrl?: string; // Owner avatar (creator)
  userId: string;
  isArchived?: boolean; // New field
  archivedAt?: string; // New field
  isDeleted?: boolean; // New: soft delete flag
  deletedAt?: string; // New: soft delete timestamp
  completedAt?: string; // When task was marked as done (managed by DB trigger)
  isOptimistic?: boolean; // For optimistic updates
  priority?: boolean; // New priority field - true means high priority
  orderPosition?: number; // For drag and drop ordering
  companyId?: string; // New: company scoping for personal tasks
  groupId?: string; // Links individual task copies created for multiple members
}

export interface TeamInfo {
  id: string;
  name: string;
  company_id: string;
}

export type TaskFilter = 'all' | 'active' | 'completed' | 'personal' | 'team';

export interface TaskCounts {
  total: number;
  active: number;
  completed: number;
  personal: number;
  team: number;
}
