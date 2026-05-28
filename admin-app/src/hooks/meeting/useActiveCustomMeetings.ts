import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { logger } from '@/utils/logger';

interface ActiveCustomMeeting {
  id: string;
  team_id: string;
  team_name: string;
  company_name: string;
  meeting_title?: string;
  started_at: string;
  current_section: number;
  custom_agenda: any[];
}

export const useActiveCustomMeetings = () => {
  const { currentCompany } = useMultiCompanyAccess();

  const { data: customMeetings = [], isLoading, error } = useQuery({
    queryKey: ['active-custom-meetings', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) {
        return [];
      }

      logger.log('🔍 Fetching active custom meetings for company:', currentCompany?.id);

      // Query 1: Team-based custom meetings
      const { data: teamMeetings, error: teamError } = await supabase
        .from('meetings_state')
        .select(`
          id,
          team_id,
          company_id,
          meeting_title,
          started_at,
          current_section,
          custom_agenda,
          audience_type,
          selected_members,
          teams (
            name,
            company_id
          )
        `)
        .eq('status', 'active')
        .eq('meeting_type', 'custom')
        .not('team_id', 'is', null);

      if (teamError) {
        logger.error('❌ Error fetching team custom meetings:', teamError);
        throw teamError;
      }

      // Query 2: Member-based custom meetings (team_id is null)
      const { data: memberMeetings, error: memberError } = await supabase
        .from('meetings_state')
        .select(`
          id,
          team_id,
          company_id,
          meeting_title,
          started_at,
          current_section,
          custom_agenda,
          audience_type,
          selected_members,
          companies:company_id (
            name
          )
        `)
        .eq('status', 'active')
        .eq('meeting_type', 'custom')
        .is('team_id', null)
        .eq('company_id', currentCompany?.id);

      if (memberError) {
        logger.error('❌ Error fetching member custom meetings:', memberError);
        throw memberError;
      }

      // Filter team meetings by company_id (client-side check)
      const filteredTeamMeetings = (teamMeetings || []).filter((meeting: any) => 
        meeting.teams?.company_id === currentCompany?.id
      );

      // Merge both result sets
      const allMeetings = [...filteredTeamMeetings, ...(memberMeetings || [])];

      // Transform the data to flatten the structure
      const transformedData = allMeetings.map((meeting: any) => {
        let teamName = 'Member Meeting';
        let companyName = currentCompany?.name || 'Unknown';
        
        if (meeting.team_id && meeting.teams) {
          teamName = meeting.teams.name;
          companyName = currentCompany?.name || 'Unknown';
        } else if (!meeting.team_id && meeting.companies) {
          companyName = meeting.companies.name;
        }
        
        return {
          id: meeting.id,
          team_id: meeting.team_id || meeting.id,
          team_name: teamName,
          company_name: companyName,
          meeting_title: meeting.meeting_title,
          started_at: meeting.started_at,
          current_section: meeting.current_section,
          custom_agenda: meeting.custom_agenda || [],
        };
      });

      // Sort by started_at descending
      transformedData.sort((a, b) => 
        new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
      );

      logger.log('✅ Fetched active custom meetings:', transformedData.length);
      return transformedData as ActiveCustomMeeting[];
    },
    enabled: !!currentCompany?.id,
    staleTime: 30000,
    refetchInterval: 30000,
  });

  return {
    customMeetings,
    isLoading,
    error,
  };
};
