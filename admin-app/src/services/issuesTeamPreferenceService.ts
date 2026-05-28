import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface IssuesTeamPreferenceService {
  getMostLikelyTeam: (userId: string) => Promise<string | null>;
  updateTeamPreference: (userId: string, teamId: string) => Promise<void>;
}

class IssuesTeamPreferenceServiceImpl implements IssuesTeamPreferenceService {
  
  /**
   * Returns the most likely team for creating issues.
   * Currently disabled: The RPC function 'get_user_most_likely_issues_team' does not exist in the database.
   * This gracefully returns null until the function is created, allowing the user to manually select a team.
   */
  async getMostLikelyTeam(_userId: string): Promise<string | null> {
    // TODO: Implement when 'get_user_most_likely_issues_team' RPC function is created in the database
    // The similar function 'get_user_most_likely_goals_team' exists and can be used as a reference
    return null;
  }

  async updateTeamPreference(userId: string, teamId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('update_issues_team_preference', {
        p_user_id: userId,
        p_team_id: teamId
      });

      if (error) {
        logger.error('Error updating issues team preference:', error);
        throw new Error('Failed to update team preference');
      }
    } catch (error) {
      logger.error('Error in updateTeamPreference:', error);
      throw error;
    }
  }
}

export const issuesTeamPreferenceService = new IssuesTeamPreferenceServiceImpl();