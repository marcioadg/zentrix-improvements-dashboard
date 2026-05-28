import { supabase } from '@/integrations/supabase/client';
import { Team } from '@/types/team';
import { addMembersToTeam } from './teamMemberService';
import { logger } from '@/utils/logger';

export const loadTeamsForCompany = async (companyId: string): Promise<Team[]> => {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select(`
        id,
        name,
        description,
        company_id,
        created_by,
        created_at,
        updated_at,
        is_leadership,
        has_strategic_plan,
        team_members (count)
      `)
      .eq('company_id', companyId)
      .order('name', { ascending: true });

    if (error) {
      logger.error('Error loading teams:', error);
      throw new Error(`Failed to load teams: ${error.message}`);
    }

    const teams: Team[] = (data || []).map(team => ({
      id: team.id,
      name: team.name,
      description: team.description,
      company_id: team.company_id,
      created_by: team.created_by,
      created_at: team.created_at,
      updated_at: team.updated_at,
      is_leadership: team.is_leadership,
      has_strategic_plan: team.has_strategic_plan,
      member_count: team.team_members ? team.team_members[0].count : 0,
    }));

    return teams;
  } catch (error) {
    logger.error('Error in loadTeamsForCompany:', error);
    throw error;
  }
};

export const createTeamWithMembers = async (
  name: string,
  companyId: string,
  userId: string,
  description?: string,
  memberIds?: string[],
  isLeadership: boolean = false,
  hasStrategicPlan: boolean = false
): Promise<Team> => {
  logger.log('teamOperationsService: Creating team with leadership flag', {
    name,
    companyId,
    userId,
    description,
    memberIds: memberIds?.length || 0,
    isLeadership
  });

  try {
    // If this team is being marked as leadership, first unmark any existing leadership team
    if (isLeadership) {
      logger.log('teamOperationsService: Unmarking existing leadership team');
      const { error: unmarkError } = await supabase
        .from('teams')
        .update({ is_leadership: false })
        .eq('company_id', companyId)
        .eq('is_leadership', true);

      if (unmarkError) {
        logger.error('teamOperationsService: Error unmarking existing leadership team:', unmarkError);
      }
    }

    // Create the team
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({
        name,
        description: description || null,
        company_id: companyId,
        created_by: userId,
        is_leadership: isLeadership,
        has_strategic_plan: hasStrategicPlan
      })
      .select(`
        id,
        name,
        description,
        company_id,
        created_by,
        created_at,
        updated_at,
        is_leadership,
        has_strategic_plan
      `)
      .single();

    if (teamError) {
      logger.error('teamOperationsService: Error creating team:', teamError);
      throw new Error(`Failed to create team: ${teamError.message}`);
    }

    logger.log('teamOperationsService: Team created successfully:', team);

    // Always add the creator as a team member
    const memberInserts = [{
      team_id: team.id,
      user_id: userId
    }];

    // Add additional team members if provided
    if (memberIds && memberIds.length > 0) {
      logger.log('teamOperationsService: Adding additional members to team:', memberIds.length);
      
      // Filter out the creator to avoid duplicate entries
      const additionalMembers = memberIds
        .filter(memberId => memberId !== userId)
        .map(memberId => ({
          team_id: team.id,
          user_id: memberId
        }));

      memberInserts.push(...additionalMembers);
    }

    logger.log('teamOperationsService: Adding all members to team:', memberInserts.length);
    const { error: membersError } = await supabase
      .from('team_members')
      .insert(memberInserts);

    if (membersError) {
      logger.error('teamOperationsService: Error adding team members:', membersError);
      // Don't throw error here, team creation was successful
    } else {
      logger.log('teamOperationsService: All team members added successfully');
    }

    // Get member count for the response
    const { count: memberCount } = await supabase
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', team.id);

    return {
      ...team,
      member_count: memberCount || 0
    };

  } catch (error) {
    logger.error('teamOperationsService: Error in createTeamWithMembers:', error);
    throw error;
  }
};

export const updateTeamWithMembers = async (
  teamId: string,
  companyId: string,
  updates: { name?: string; description?: string; is_leadership?: boolean; has_strategic_plan?: boolean }
): Promise<Team> => {
  logger.log('teamOperationsService: Updating team', {
    teamId,
    companyId,
    updates
  });

  try {
    // If this team is being marked as leadership, first unmark any existing leadership team
    if (updates.is_leadership === true) {
      logger.log('teamOperationsService: Unmarking existing leadership team');
      const { error: unmarkError } = await supabase
        .from('teams')
        .update({ is_leadership: false })
        .eq('company_id', companyId)
        .eq('is_leadership', true)
        .neq('id', teamId); // Don't unmark the team we're updating

      if (unmarkError) {
        logger.error('teamOperationsService: Error unmarking existing leadership team:', unmarkError);
      }
    }

    // Update the team
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', teamId)
      .eq('company_id', companyId)
      .select(`
        id,
        name,
        description,
        company_id,
        created_by,
        created_at,
        updated_at,
        is_leadership,
        has_strategic_plan
      `)
      .single();

    if (teamError) {
      logger.error('teamOperationsService: Error updating team:', teamError);
      throw new Error(`Failed to update team: ${teamError.message}`);
    }

    logger.log('teamOperationsService: Team updated successfully:', team);

    // Get updated member count
    const { count: memberCount } = await supabase
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId);

    return {
      ...team,
      member_count: memberCount || 0
    };

  } catch (error) {
    logger.error('teamOperationsService: Error in updateTeamWithMembers:', error);
    throw error;
  }
};

export const deleteTeamCompletely = async (teamId: string, companyId: string): Promise<void> => {
  try {
    logger.log('teamOperationsService: Starting server-side cascade delete for team', { teamId, companyId });

    const { data, error } = await supabase.rpc('delete_team_cascade', { p_team_id: teamId });

    if (error) {
      logger.error('teamOperationsService: RPC delete_team_cascade error:', error);
      throw new Error(`Failed to delete team: ${error.message}`);
    }

    if (!data || data.success !== true) {
      logger.error('teamOperationsService: RPC delete_team_cascade returned failure:', data);
      throw new Error(data?.error || 'Failed to delete team');
    }

    logger.log('teamOperationsService: Cascade delete completed. Deleted counts:', data.deleted);
  } catch (error) {
    logger.error('teamOperationsService: Error in deleteTeamCompletely:', error);
    throw error;
  }
};
