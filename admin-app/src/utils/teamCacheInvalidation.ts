import { QueryClient } from '@tanstack/react-query';
import { requestDeduplicator } from '@/utils/requestDeduplicator';
import { logger } from '@/utils/logger';

/**
 * Safe utility for invalidating team-related caches across the application
 * Ensures optimistic updates work consistently without affecting performance
 */
export class TeamCacheInvalidator {
  private static instance: TeamCacheInvalidator;
  
  static getInstance(): TeamCacheInvalidator {
    if (!TeamCacheInvalidator.instance) {
      TeamCacheInvalidator.instance = new TeamCacheInvalidator();
    }
    return TeamCacheInvalidator.instance;
  }

  /**
   * Safely invalidate all team-related caches for a company
   */
  async invalidateTeamCaches(queryClient: QueryClient, companyId: string, userId?: string) {
    try {
      // Invalidate React Query caches
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['userTeams'] }),
        queryClient.invalidateQueries({ queryKey: ['company-teams', companyId] }),
        queryClient.invalidateQueries({ queryKey: ['teams'] }),
        queryClient.invalidateQueries({ queryKey: ['strategy-teams'] }),
      ]);

      // Invalidate request deduplicator caches
      if (userId) {
        requestDeduplicator.invalidateCache(`teams-${userId}-${companyId}`);
        requestDeduplicator.invalidateCache(`teams-fallback-${userId}`);
        requestDeduplicator.invalidateCache(`strategy-teams-${userId}-${companyId}`);
      }
      requestDeduplicator.invalidateCache(`teams-${companyId}`);
      requestDeduplicator.invalidateCache(`strategy-teams-${companyId}`);
      
      logger.log('TeamCacheInvalidator: Successfully invalidated team caches for company:', companyId);
    } catch (error) {
      logger.error('TeamCacheInvalidator: Error invalidating caches:', error);
      // Don't throw - cache invalidation should be non-blocking
    }
  }

  /**
   * Trigger optimistic team creation event for strategy teams
   */
  triggerOptimisticTeamCreation(team: any, userId: string) {
    try {
      // Only trigger for strategic teams
      if (team.has_strategic_plan) {
        const event = new CustomEvent('optimistic-team-created', {
          detail: {
            id: team.id,
            name: team.name,
            description: team.description,
            company_id: team.company_id,
            has_strategic_plan: team.has_strategic_plan,
            is_leadership: team.is_leadership
          }
        });
        
        window.dispatchEvent(event);
        logger.log('TeamCacheInvalidator: Triggered optimistic team creation for:', team.name);
      }
    } catch (error) {
      logger.error('TeamCacheInvalidator: Error triggering optimistic update:', error);
    }
  }

  /**
   * Optimistically update team data in React Query cache
   */
  optimisticallyUpdateTeamData(queryClient: QueryClient, newTeam: any, userId: string, companyId: string) {
    try {
      // Update the userTeams query cache optimistically
      queryClient.setQueryData(
        ['userTeams', userId, companyId, true],
        (oldData: any[]) => {
          if (!Array.isArray(oldData)) return [newTeam];
          const teamExists = oldData.some(team => team.id === newTeam.id);
          return teamExists ? oldData : [...oldData, newTeam];
        }
      );
      
      logger.log('TeamCacheInvalidator: Optimistically updated team data for:', newTeam.name);
    } catch (error) {
      logger.error('TeamCacheInvalidator: Error in optimistic update:', error);
      // Don't throw - optimistic updates should be non-blocking
    }
  }
}

export const teamCacheInvalidator = TeamCacheInvalidator.getInstance();