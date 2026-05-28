
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';
import { logger } from '@/utils/logger';

interface OptimizedMeetingData {
  id: string;
  team_id: string;
  team_name: string;
  company_name: string;
  company_id: string;
  meeting_type: string;
  meeting_title?: string;
  current_section: number;
  started_at: string;
  ended_at: string | null;
  scriber_id: string | null;
  status: string;
  meeting_results?: {
    meeting_ratings?: any;
    total_duration_seconds?: number;
  };
}

export const useOptimizedMeetingsData = () => {
  const { user } = useAuth();
  
  // Safely get current company, but don't block on it
  let currentCompany = null;
  try {
    const multiCompanyContext = useMultiCompany();
    currentCompany = multiCompanyContext.currentCompany;
  } catch (error) {
    // Silent fail - context not available
  }

  // Single optimized query with enhanced caching
  const {
    data: rawData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['optimized-meetings-data', user?.id, currentCompany?.id],
    queryFn: async () => {
      if (!user) throw new Error('No authenticated user');

      // First, get user's team memberships to filter meetings properly
      const { data: memberships, error: membershipError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id);

      if (membershipError) {
        throw membershipError;
      }

      const userTeamIds = new Set((memberships || []).map(m => m.team_id));

      // Check if user is super_admin (they can see all company meetings)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      const isSuperAdmin = profileData?.role === 'super_admin';

      // Query meetings directly with optimized select
      const { data: meetingsData, error: meetingsError } = await supabase
        .from('meetings_state')
        .select(`
          id,
          team_id,
          company_id,
          meeting_type,
          meeting_title,
          current_section,
          started_at,
          ended_at,
          scriber_id,
          status,
          audience_type,
          selected_members,
          teams (
            id,
            name,
            company_id
          ),
          companies:company_id (
            id,
            name
          ),
          meeting_results (
            meeting_ratings,
            total_duration_seconds
          )
        `)
         .in('status', ['active', 'ended'])
         .order('started_at', { ascending: false });

      if (meetingsError) {
        throw meetingsError;
      }

      // Transform the nested data structure efficiently
      const transformedData: OptimizedMeetingData[] = (meetingsData || [])
        .filter(meeting => {
          // For team meetings: check team company AND user membership
          if (meeting.team_id && meeting.teams) {
            const team = meeting.teams as any;
            if (currentCompany) {
              // Must match company
              if (team.company_id !== currentCompany?.id) return false;
              // Super admins see all company meetings, others only their teams
              return isSuperAdmin || userTeamIds.has(meeting.team_id);
            }
            return isSuperAdmin || userTeamIds.has(meeting.team_id);
          }
          
          // For member meetings (no team): check direct company_id
          if (!meeting.team_id && meeting.company_id) {
            if (currentCompany) {
              return meeting.company_id === currentCompany?.id;
            }
            return true;
          }
          
          return false; // Invalid meeting state
        })
        .map(meeting => {
          // Determine company and team names
          let teamName = 'Member Meeting';
          let companyName = 'Unknown';
          let companyId = meeting.company_id || '';
          
          if (meeting.team_id && meeting.teams) {
            const team = meeting.teams as any;
            teamName = team.name;
            companyId = team.company_id;
            
            // Get company name - teams join might not have nested companies anymore
            // Try direct company join first
            if (meeting.companies) {
              companyName = (meeting.companies as any).name;
            }
          } else if (!meeting.team_id && meeting.companies) {
            // Member meeting with direct company join
            companyName = (meeting.companies as any).name;
          }
          
          // Handle meeting_results efficiently
          let meetingResults;
          if (Array.isArray(meeting.meeting_results)) {
            meetingResults = meeting.meeting_results[0] || undefined;
          } else {
            meetingResults = meeting.meeting_results || undefined;
          }
          
          return {
            id: meeting.id,
            team_id: meeting.team_id || meeting.id,  // Use meeting ID for member meetings
            team_name: teamName,
            company_name: companyName,
            company_id: companyId,
            meeting_type: meeting.meeting_type,
            meeting_title: meeting.meeting_title,
            current_section: meeting.current_section,
            started_at: meeting.started_at,
            ended_at: meeting.ended_at,
            scriber_id: meeting.scriber_id,
            status: meeting.status,
            meeting_results: meetingResults
          };
        });

      return transformedData;
    },
    enabled: !!user,
    retry: 1,
    staleTime: 30 * 1000, // 30 seconds - reduced for better real-time responsiveness
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    refetchInterval: false,
    refetchOnMount: 'always',
  });

  // Process the data for final consumption
  const processedMeetings = useMemo(() => {
    if (!rawData) return [];
    
    return rawData.map(meeting => {
      let averageRating: number | undefined;
      let totalDurationSeconds: number | undefined;
      
      if (meeting.meeting_results) {
        totalDurationSeconds = meeting.meeting_results.total_duration_seconds;
        
        if (meeting.meeting_results.meeting_ratings) {
          // Use the existing rating processing logic
          try {
            let ratingsObject: Record<string, any> = {};
            
            if (typeof meeting.meeting_results.meeting_ratings === 'string') {
              ratingsObject = JSON.parse(meeting.meeting_results.meeting_ratings);
            } else if (typeof meeting.meeting_results.meeting_ratings === 'object') {
              ratingsObject = meeting.meeting_results.meeting_ratings;
            }
            
            const ratings: number[] = [];
            Object.values(ratingsObject).forEach(value => {
              if (typeof value === 'number' && !isNaN(value) && value > 0) {
                ratings.push(value);
              } else if (typeof value === 'string') {
                const parsed = parseFloat(value);
                if (!isNaN(parsed) && parsed > 0) {
                  ratings.push(parsed);
                }
              }
            });
            
            if (ratings.length > 0) {
              averageRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
            }
          } catch (error) {
            logger.error('🚨 useOptimizedMeetingsData: Error processing ratings:', error);
          }
        }
      }
      
      return {
        id: meeting.id,
        team_id: meeting.team_id,
        team_name: meeting.team_name,
        company_name: meeting.company_name,
        meeting_type: meeting.meeting_type,
        meeting_title: meeting.meeting_title,
        current_section: meeting.current_section,
        started_at: meeting.started_at,
        ended_at: meeting.ended_at,
        scriber_id: meeting.scriber_id,
        status: meeting.status,
        average_rating: averageRating,
        total_duration_seconds: totalDurationSeconds
      };
    });
  }, [rawData]);

  return {
    meetings: processedMeetings,
    loading: isLoading,
    error: error?.message || null,
    refetch
  };
};
