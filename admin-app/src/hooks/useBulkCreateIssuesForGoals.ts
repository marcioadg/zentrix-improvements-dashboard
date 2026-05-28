import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { generateGoalIssueTitle, generateGoalIssueDescription, createGoalIssueData, type GoalIssueData } from '@/utils/goalIssueUtils';
import { logger } from '@/utils/logger';

export const useBulkCreateIssuesForGoals = (
  teamId: string,
  companyId: string,
  refetchIssues?: () => void,
  refetchGoals?: () => void
) => {
  const [isCreating, setIsCreating] = useState(false);

  const createIssuesForOffTrackGoals = async (archiveAfter: boolean = false) => {
    setIsCreating(true);
    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    let archivedCount = 0;
    let archiveFailCount = 0;
    const allOffTrackGoalIds: string[] = [];  // Track all goals to archive regardless of outcome
    const successfulGoalIds: string[] = [];   // Track for reporting only

    try {
      // Fetch team-specific off-track goals that aren't archived
      const { data: teamOffTrackGoals, error: teamGoalsError } = await supabase
        .from('team_goals')
        .select('*')
        .eq('team_id', teamId)
        .eq('status', 'off_track')
        .eq('is_company_goal', false)
        .or('archived.is.null,archived.eq.false');

      if (teamGoalsError) throw teamGoalsError;

      // Fetch company off-track goals that aren't archived
      const { data: companyOffTrackGoals, error: companyGoalsError } = await supabase
        .from('team_goals')
        .select('*, teams!inner(company_id)')
        .eq('teams.company_id', companyId)
        .eq('status', 'off_track')
        .eq('is_company_goal', true)
        .or('archived.is.null,archived.eq.false');

      if (companyGoalsError) throw companyGoalsError;

      // Combine both team and company goals
      const offTrackGoals = [...(teamOffTrackGoals || []), ...(companyOffTrackGoals || [])];

      if (!offTrackGoals || offTrackGoals.length === 0) {
        toast("No off-track goals", {
          description: "There are no off-track goals to create issues for"
        });
        setIsCreating(false);
        return;
      }

      // Fetch profiles for all goal owners
      const ownerIds = Array.from(new Set(offTrackGoals.map(goal => goal.owner_id).filter(Boolean)));
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', ownerIds);

      // Create profile lookup function
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const getProfileName = (userId: string): string => {
        const profile = profileMap.get(userId);
        return profile?.full_name || profile?.email || 'Unknown';
      };

      // Fetch active team members to avoid creating issues for former members.
      // If the query fails the Set stays empty and we bypass the check (safe fallback).
      const { data: teamMembersData } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', teamId);
      const activeTeamMemberIds = new Set(teamMembersData?.map(m => m.user_id) || []);
      const memberCheckEnabled = activeTeamMemberIds.size > 0;

      // Fetch existing issues to prevent duplicates (only check non-archived)
      const { data: existingIssues } = await supabase
        .from('issues')
        .select('title, description')
        .eq('team_id', teamId)
        .eq('archived', false);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Process each off-track goal
      for (const goal of offTrackGoals) {
        // Track this goal for archiving regardless of issue creation outcome
        allOffTrackGoalIds.push(goal.id); // Always track for archiving, regardless of issue outcome

        // Skip issue creation if the goal owner is no longer an active team member.
        // The goal is still tracked in allOffTrackGoalIds so archiving (if requested) still applies.
        if (memberCheckEnabled && !activeTeamMemberIds.has(goal.owner_id)) {
          logger.warn(`⚠️ Skipping issue for goal "${goal.title}" — owner ${goal.owner_id} is no longer a team member`);
          skippedCount++;
          continue;
        }
        
        const goalData: GoalIssueData = {
          id: goal.id,
          title: goal.title,
          description: goal.description,
          status: goal.status,
          owner_id: goal.owner_id,
          target_date: goal.target_date,
          is_company_goal: goal.is_company_goal
        };

        const issueTitle = generateGoalIssueTitle(goalData);
        const issueDescription = generateGoalIssueDescription(goalData, getProfileName);

        // Normalize for comparison
        const normalizedTitle = issueTitle.trim();
        const normalizedDescription = issueDescription.trim();

        // Check for exact duplicates (title AND description)
        const isDuplicate = existingIssues?.some(issue => {
          const existingTitle = issue.title.trim();
          const existingDescription = (issue.description || '').trim();
          return existingTitle === normalizedTitle && existingDescription === normalizedDescription;
        });

        if (isDuplicate) {
          logger.log(`Skipping duplicate issue for goal: ${goal.title}`);
          skippedCount++;
          continue;
        }

        // Create issue data
        const issueData = createGoalIssueData(
          goalData,
          teamId,
          user.id,
          getProfileName
        );

        // Insert issue
        const { error: insertError } = await supabase
          .from('issues')
          .insert(issueData);

        if (insertError) {
          logger.error('Error creating issue for goal:', goal.title, insertError);
          errorCount++;
        } else {
          successCount++;
          successfulGoalIds.push(goal.id);
        }
      }

      // Refetch issues if callback provided
      if (refetchIssues) {
        refetchIssues();
      }

      // Archive ALL off-track goals when checkbox is marked
      if (archiveAfter && allOffTrackGoalIds.length > 0) {
        logger.log(`🗄️ Archiving ${allOffTrackGoalIds.length} off-track goals...`);

        for (const goalId of allOffTrackGoalIds) {
          try {
            const { error: archiveError } = await supabase
              .from('team_goals')
              .update({ 
                archived: true, 
                updated_at: new Date().toISOString() 
              })
              .eq('id', goalId);

            if (archiveError) {
              logger.error(`❌ Failed to archive goal ${goalId}:`, archiveError);
              archiveFailCount++;
            } else {
              logger.log(`✅ Archived goal ${goalId}`);
              archivedCount++;
            }
          } catch (error) {
            logger.error(`❌ Error archiving goal ${goalId}:`, error);
            archiveFailCount++;
          }
        }

        logger.log(`📊 Archive results: ${archivedCount} succeeded, ${archiveFailCount} failed`);

        // Refresh goals list if callback provided and any goals were archived
        if (refetchGoals && archivedCount > 0) {
          refetchGoals();
        }
      }

      // Show comprehensive feedback combining all results
      const messageParts: string[] = [];
      
      if (successCount > 0) {
        messageParts.push(`Created ${successCount} issue${successCount !== 1 ? 's' : ''}`);
      }
      
      if (skippedCount > 0) {
        messageParts.push(`skipped ${skippedCount} duplicate${skippedCount !== 1 ? 's' : ''}`);
      }
      
      if (archivedCount > 0) {
        messageParts.push(`archived ${archivedCount} goal${archivedCount !== 1 ? 's' : ''}`);
      }
      
      if (errorCount > 0) {
        messageParts.push(`${errorCount} issue${errorCount !== 1 ? 's' : ''} failed`);
      }
      
      if (archiveFailCount > 0) {
        messageParts.push(`${archiveFailCount} goal${archiveFailCount !== 1 ? 's' : ''} failed to archive`);
      }

      // Determine toast type based on presence of errors
      const hasErrors = errorCount > 0 || archiveFailCount > 0;
      const hasSuccess = successCount > 0 || archivedCount > 0;
      
      if (messageParts.length > 0) {
        const message = messageParts.join(', ');
        
        if (hasErrors) {
          toast.error(`Completed with errors: ${message}`);
        } else if (hasSuccess) {
          toast.success(message);
        } else {
          toast(message);
        }
      } else if (offTrackGoals.length > 0) {
        // Edge case: had goals but nothing happened (all skipped)
        toast("No changes made", {
          description: "All issues already exist and no goals were archived"
        });
      }

    } catch (error) {
      logger.error('Error in bulk issue creation:', error);
      toast.error("Failed to create issues for off-track goals");
    } finally {
      setIsCreating(false);
    }
  };

  return {
    createIssuesForOffTrackGoals,
    isCreating
  };
};
