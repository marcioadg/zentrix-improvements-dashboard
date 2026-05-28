import { useMemo } from 'react';
import { FastTask, TeamInfo } from './fast-tasks/types';

/**
 * Optimized hook for filtering tasks by company
 * Uses memoization to prevent unnecessary re-filtering
 */
export const useOptimizedTaskFiltering = (
  tasks: FastTask[],
  teamInfo: TeamInfo[],
  currentCompanyId?: string
) => {
  // Memoize company team IDs to avoid recalculating
  const companyTeamIds = useMemo(() => {
    if (!currentCompanyId || !teamInfo.length) return new Set<string>();
    
    return new Set(
      teamInfo
        .filter(team => team.company_id === currentCompanyId)
        .map(team => team.id)
    );
  }, [teamInfo, currentCompanyId]);

  // Memoize filtered tasks
  const filteredTasks = useMemo(() => {
    if (!currentCompanyId) {
      return tasks.filter(task => task.taskType === 'personal');
    }

    return tasks.filter(task => {
      if (task.taskType === 'personal') {
        return task.companyId === currentCompanyId;
      }
      
      if (task.taskType === 'team' && task.teamId) {
        return companyTeamIds.has(task.teamId);
      }
      
      return false;
    });
  }, [tasks, companyTeamIds, currentCompanyId]);

  // Memoize task breakdown for performance metrics
  const taskBreakdown = useMemo(() => ({
    personal: filteredTasks.filter(t => t.taskType === 'personal').length,
    team: filteredTasks.filter(t => t.taskType === 'team').length,
    total: filteredTasks.length
  }), [filteredTasks]);

  return {
    filteredTasks,
    taskBreakdown,
    hasCompanyContext: !!currentCompanyId
  };
};