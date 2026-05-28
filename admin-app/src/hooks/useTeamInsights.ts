import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { logger } from '@/utils/logger';

interface TeamMember {
  id: string;
  name: string;
  avatar_url?: string;
  task_count: number;
  issue_count: number;
  total_count: number;
}

interface Meeting {
  id: string;
  title: string;
  scheduled_time: string;
}

export const useTeamInsights = () => {
  const [activeMembers, setActiveMembers] = useState<TeamMember[]>([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentCompany } = useMultiCompanyAccess();

  useEffect(() => {
    if (!currentCompany) {
      logger.log('🔍 useTeamInsights: No current company');
      setLoading(false);
      return;
    }

    const fetchTeamInsights = async () => {
      try {
        logger.log('🔍 useTeamInsights: Fetching for company:', currentCompany?.name);
        
        // Fetch team members from current company
        const { data: members } = await supabase
          .from('team_members')
          .select(`
            user_id,
            profiles!inner(id, full_name, avatar_url),
            teams!inner(company_id)
          `)
          .eq('teams.company_id', currentCompany?.id)
          .limit(10);

        logger.log('🔍 useTeamInsights: Found team members:', members?.length || 0);

        // Get the start of this week (Monday)
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
        startOfWeek.setHours(0, 0, 0, 0);

        // Fetch completed tasks for each member this week
        const membersWithActivity: TeamMember[] = [];
        
        for (const member of (members || [])) {
          // Get completed tasks this week for this member
          const { data: completedTasks } = await supabase
            .from('fast_tasks')
            .select('id')
            .eq('status', 'done')
            .or(`user_id.eq.${member.user_id},assigned_to.cs.{${member.user_id}}`)
            .gte('updated_at', startOfWeek.toISOString());

          // Get completed issues this week for this member
          const { data: completedIssues } = await supabase
            .from('issues')
            .select('id')
            .eq('status', 'resolved')
            .eq('owner_id', member.user_id)
            .gte('updated_at', startOfWeek.toISOString());

          const taskCount = completedTasks?.length || 0;
          const issueCount = completedIssues?.length || 0;
          const totalCount = taskCount + issueCount;

          membersWithActivity.push({
            id: member.user_id,
            name: (member as any).profiles?.full_name || 'Unknown',
            avatar_url: (member as any).profiles?.avatar_url,
            task_count: taskCount,
            issue_count: issueCount,
            total_count: totalCount
          });
        }

        // Sort by total activity count (highest first)
        membersWithActivity.sort((a, b) => b.total_count - a.total_count);

        // Fetch upcoming meetings for current company teams
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const { data: meetings } = await supabase
          .from('meetings')
          .select(`
            id,
            title,
            scheduled_time,
            teams!inner(company_id)
          `)
          .eq('teams.company_id', currentCompany?.id)
          .gte('scheduled_time', new Date().toISOString())
          .lte('scheduled_time', tomorrow.toISOString())
          .order('scheduled_time', { ascending: true })
          .limit(5);

        logger.log('🔍 useTeamInsights: Found upcoming meetings:', meetings?.length || 0);

        setActiveMembers(membersWithActivity);
        setUpcomingMeetings(meetings || []);
      } catch (error) {
        logger.error('❌ useTeamInsights: Error fetching team insights:', error);
        setActiveMembers([]);
        setUpcomingMeetings([]);
        setError('Failed to load team insights');
      } finally {
        setLoading(false);
      }
    };

    fetchTeamInsights();
  }, [currentCompany]);

  return {
    activeMembers,
    upcomingMeetings,
    loading,
    error
  };
};