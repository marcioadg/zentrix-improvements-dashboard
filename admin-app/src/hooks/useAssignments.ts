
import { useState, useEffect } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { toastService } from '@/services/toastService';

export const useAssignments = () => {
  const { profile } = useProfile();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (profile?.id) {
      fetchUserAssignments();
    }
  }, [profile?.id]);

  const fetchUserAssignments = async () => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_user_assignments', {
        p_user_id: profile.id
      });
      if (error) throw error;
      setAssignments(data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      toastService.error("Failed to load assignments");
    } finally {
      setLoading(false);
    }
  };

  const assignPlaybook = async (playbookId: string, userId: string, dueDate?: string, notes?: string) => {
    if (!profile?.id) throw new Error('Cannot assign playbook: user not authenticated');
    try {
      const { error } = await supabase.rpc('assign_playbook_to_user', {
        p_playbook_id: playbookId,
        p_user_id: userId,
        p_assigned_by: profile.id,
        p_due_date: dueDate ? new Date(dueDate).toISOString() : null,
        p_notes: notes
      });
      if (error) throw error;
      await fetchUserAssignments();
      return true;
    } catch (err: any) {
      toastService.error(`Failed to assign playbook: ${err.message}`);
      throw err;
    }
  };

  // NEW: Visibility mutation methods
  const setPlaybookVisibility = async (
    playbookId: string,
    visibilityType: 'everyone' | 'teams' | 'people',
    options: { teamIds?: string[], userIds?: string[] } = {}
  ) => {
    if (!profile?.id) throw new Error("User not authenticated");
    let errorMsg = "";
    try {
      // Step 1: Update playbook visibility_type, workaround missing generated types
      const { error: pbError } = await (supabase
        .from('playbooks')
        // @ts-ignore: visibility_type not in types yet
        .update({ visibility_type: visibilityType } as any)
        .eq('id', playbookId)
      );
      if (pbError) throw pbError;

      // Step 2: Update relations using 'as any' for untyped tables
      if (visibilityType === 'teams') {
        // Clear old, insert new
        await (supabase as any).from('playbook_team_visibility').delete().eq('playbook_id', playbookId);
        if (options.teamIds) {
          for (const teamId of options.teamIds) {
            await (supabase as any).from('playbook_team_visibility').insert([{ playbook_id: playbookId, team_id: teamId }]);
          }
        }
      } else if (visibilityType === 'people') {
        await (supabase as any).from('playbook_user_visibility').delete().eq('playbook_id', playbookId);
        if (options.userIds) {
          for (const userId of options.userIds) {
            await (supabase as any).from('playbook_user_visibility').insert([{ playbook_id: playbookId, user_id: userId }]);
          }
        }
      } else { // everyone
        await (supabase as any).from('playbook_team_visibility').delete().eq('playbook_id', playbookId);
        await (supabase as any).from('playbook_user_visibility').delete().eq('playbook_id', playbookId);
      }
      toastService.info('Visibility updated!'); // <-- fixed method call
      return true;
    } catch (err: any) {
      errorMsg = "Failed to set visibility: " + err.message;
      toastService.error(errorMsg);
      throw err;
    }
  };

  const selfAssignPlaybook = async (playbookId: string) => {
    if (!profile?.id) throw new Error('User not authenticated');
    return assignPlaybook(playbookId, profile.id, null, 'Self-assigned for testing');
  };

  return {
    assignments,
    loading,
    error,
    fetchUserAssignments,
    assignPlaybook,
    selfAssignPlaybook,
    setPlaybookVisibility // new
  };
};
