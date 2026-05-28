
import { FastTask, TeamInfo } from './types';
import { logger } from '@/utils/logger';

export const transformDatabaseTask = (dbTask: any): FastTask => {
  // For team tasks, use current team name from join, fallback to stored team_name
  const teamName = dbTask.teams?.name || dbTask.team_name;
  
  return {
    id: dbTask.id,
    title: dbTask.title,
    description: dbTask.description || '',
    status: dbTask.status,
    dueDate: dbTask.due_date,
    createdAt: dbTask.created_at,
    updatedAt: dbTask.updated_at,
    taskType: dbTask.task_type,
    teamId: dbTask.team_id,
    teamName: teamName,
    assignedTo: Array.isArray(dbTask.assigned_to) ? dbTask.assigned_to : (dbTask.assigned_to ? [dbTask.assigned_to] : undefined),
    assignedToAvatarUrl: undefined, // Avatar URLs fetched separately
    ownerAvatarUrl: undefined, // Owner avatar URL for personal tasks
    userId: dbTask.user_id,
    isArchived: dbTask.is_archived || false, // New field
    archivedAt: dbTask.archived_at, // New field
    isDeleted: dbTask.is_deleted || false, // New: soft delete flag
    deletedAt: dbTask.deleted_at, // New: soft delete timestamp
    completedAt: dbTask.completed_at, // When task was marked done (DB trigger managed)
    orderPosition: dbTask.order_position ?? undefined, // For drag and drop ordering
    companyId: dbTask.company_id || undefined, // New: map company scope
    groupId: dbTask.group_id || undefined, // Links individual task copies
  };
};

export const filterTasksByCompany = (
  tasks: FastTask[], 
  teamInfo: TeamInfo[], 
  currentCompanyId?: string
): FastTask[] => {
  if (!currentCompanyId) {
  logger.debug('filterTasksByCompany: No current company, returning personal tasks only');
    return tasks.filter(task => task.taskType === 'personal');
  }

  // Optimize by creating team ID set once
  const companyTeamIds = new Set(
    teamInfo
      .filter(team => team.company_id === currentCompanyId)
      .map(team => team.id)
  );

  // Efficient filtering without individual logs (major performance improvement)
  const filteredTasks = tasks.filter(task => {
    // Personal tasks: show if companyId matches OR if companyId is null/undefined (legacy tasks)
    if (task.taskType === 'personal') {
      return task.companyId === currentCompanyId || !task.companyId;
    }
    
    // Team tasks must belong to company teams
    if (task.taskType === 'team' && task.teamId) {
      return companyTeamIds.has(task.teamId);
    }
    
    return false;
  });

  logger.debug('filterTasksByCompany: Filtered results:', {
    originalCount: tasks.length,
    filteredCount: filteredTasks.length,
    personalTasks: filteredTasks.filter(t => t.taskType === 'personal').length,
    teamTasks: filteredTasks.filter(t => t.taskType === 'team').length
  });

  return filteredTasks;
};

// Create an optimistic FastTask for immediate UI feedback
export const createOptimisticTask = (
  title: string,
  description: string = '',
  dueDate?: string,
  taskType: 'personal' | 'team' = 'personal',
  teamId?: string,
  teamName?: string,
  assignedTo?: string | string[], // Now accepts both single string and array
  status: 'todo' | 'in-progress' | 'done' = 'todo',
  userId?: string,
  companyId?: string
): FastTask => {
  const now = new Date().toISOString();
  return {
    id: `optimistic-${Date.now()}`,
    title,
    description,
    status,
    dueDate,
    createdAt: now,
    updatedAt: now,
    taskType,
    teamId,
    teamName,
    assignedTo: assignedTo ? (Array.isArray(assignedTo) ? assignedTo : [assignedTo]) : undefined,
    assignedToAvatarUrl: undefined,
    ownerAvatarUrl: undefined,
    userId: userId || '',
    isArchived: false,
    archivedAt: undefined,
    isOptimistic: true,
    priority: false,
    orderPosition: undefined,
    companyId: taskType === 'personal' ? companyId : undefined,
  };
};
