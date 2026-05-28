
import { supabase } from '@/integrations/supabase/client';

export const addMembersToTeam = async (teamId: string, memberIds: string[]) => {
  if (!memberIds.length) return;

  const teamMembers = memberIds.map(userId => ({
    team_id: teamId,
    user_id: userId
  }));

  const { error } = await supabase
    .from('team_members')
    .insert(teamMembers);

  if (error) throw error;
};

export const updateTeamMembers = async (teamId: string, newMemberIds: string[]) => {
  // First, get current members
  const { data: currentMembers, error: fetchError } = await supabase
    .from('team_members')
    .select('user_id')
    .eq('team_id', teamId);

  if (fetchError) throw fetchError;

  const currentMemberIds = currentMembers?.map(m => m.user_id) || [];
  
  // Find members to add and remove
  const membersToAdd = newMemberIds.filter(id => !currentMemberIds.includes(id));
  const membersToRemove = currentMemberIds.filter(id => !newMemberIds.includes(id));

  // Remove members no longer in the team
  if (membersToRemove.length > 0) {
    const { error: removeError } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .in('user_id', membersToRemove);

    if (removeError) throw removeError;
  }

  // Add new members
  if (membersToAdd.length > 0) {
    await addMembersToTeam(teamId, membersToAdd);
  }
};

