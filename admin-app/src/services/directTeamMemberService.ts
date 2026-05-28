
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface DirectTeamMemberResult {
  success: boolean;
  message: string;
  error?: string;
}

export const addUserToTeamDirectly = async (
  userId: string, 
  teamId: string
): Promise<DirectTeamMemberResult> => {
  try {
    logger.log('directTeamMemberService: Adding user directly to team:', { userId, teamId });

    // Check if user is already a member
    const { data: existingMembership, error: checkError } = await supabase
      .from('team_members')
      .select('id')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .maybeSingle();

    if (checkError) {
      logger.error('directTeamMemberService: Error checking existing membership:', checkError);
      return {
        success: false,
        message: 'Failed to check existing membership',
        error: checkError.message
      };
    }

    if (existingMembership) {
      logger.log('directTeamMemberService: User is already a member of this team');
      return {
        success: true,
        message: 'User is already a member of this team'
      };
    }

    // Add the user to the team
    const { data: memberData, error: insertError } = await supabase
      .from('team_members')
      .insert({
        user_id: userId,
        team_id: teamId
      })
      .select()
      .single();

    if (insertError) {
      logger.error('directTeamMemberService: Error adding user to team:', insertError);
      return {
        success: false,
        message: 'Failed to add user to team',
        error: insertError.message
      };
    }

    logger.log('directTeamMemberService: Successfully added user to team:', memberData);
    return {
      success: true,
      message: 'User successfully added to team'
    };

  } catch (error) {
    logger.error('directTeamMemberService: Unexpected error:', error);
    return {
      success: false,
      message: 'Unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const removeUserFromTeamDirectly = async (
  userId: string, 
  teamId: string
): Promise<DirectTeamMemberResult> => {
  try {
    logger.log('directTeamMemberService: Removing user from team:', { userId, teamId });

    const { error: deleteError } = await supabase
      .from('team_members')
      .delete()
      .eq('user_id', userId)
      .eq('team_id', teamId);

    if (deleteError) {
      logger.error('directTeamMemberService: Error removing user from team:', deleteError);
      return {
        success: false,
        message: 'Failed to remove user from team',
        error: deleteError.message
      };
    }

    logger.log('directTeamMemberService: Successfully removed user from team');
    return {
      success: true,
      message: 'User successfully removed from team'
    };

  } catch (error) {
    logger.error('directTeamMemberService: Unexpected error:', error);
    return {
      success: false,
      message: 'Unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};
