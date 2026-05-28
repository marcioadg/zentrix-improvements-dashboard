import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, ChevronDown, ChevronUp, Eye, EyeOff, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { formatDistanceToNow } from 'date-fns';
import { MeetingDetailsModal } from './MeetingDetailsModal';
import { logger } from '@/utils/logger';

interface PastMeeting {
  id: string;
  team_id: string;
  meeting_type: string;
  status: string;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  teams: {
    id: string;
    name: string;
    company_id: string;
  };
  meeting_results: {
    meeting_ratings: any;
    issues_resolved: any[];
    total_duration_seconds: number | null;
    section_durations: any;
  } | null;
}

export const PastMeetingsList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [meetings, setMeetings] = useState<PastMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [showShortMeetings, setShowShortMeetings] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState<string | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<PastMeeting | null>(null);
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();
  const { toast } = useToast();

  // Auto-open modal from URL parameter (email deep-link)
  useEffect(() => {
    const meetingIdFromUrl = searchParams.get('meetingId');
    
    if (meetingIdFromUrl && meetings.length > 0 && !loading) {
      const meeting = meetings.find(m => m.id === meetingIdFromUrl);
      
      if (meeting) {
        setSelectedMeeting(meeting);
        // Clear the URL parameter to prevent reopening on refresh
        searchParams.delete('meetingId');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [meetings, loading, searchParams, setSearchParams]);

  useEffect(() => {
    if (!user || !currentCompany) return;

    const fetchPastMeetings = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get user's teams first
        const { data: userTeams, error: teamsError } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', user.id);

        if (teamsError) throw teamsError;

        if (!userTeams || userTeams.length === 0) {
          setMeetings([]);
          return;
        }

        const teamIds = userTeams.map(t => t.team_id);

        // Fetch completed meetings for user's teams in current company
        const { data: pastMeetings, error: meetingsError } = await supabase
          .from('meetings_state')
          .select(`
            id,
            team_id,
            meeting_type,
            status,
            created_at,
            started_at,
            ended_at,
            teams!inner(
              id,
              name,
              company_id
            ),
            meeting_results(
              meeting_ratings,
              issues_resolved,
              total_duration_seconds,
              section_durations
            )
          `)
          .in('team_id', teamIds)
          .eq('teams.company_id', currentCompany?.id)
          .eq('status', 'ended')
          .order('ended_at', { ascending: false })
          .limit(20);

        if (meetingsError) throw meetingsError;

        logger.log('🔍 PastMeetingsList: Raw query results:', pastMeetings);

        setMeetings((pastMeetings || []).map(meeting => {
          logger.log('🔍 PastMeetingsList: Processing meeting:', {
            meetingId: meeting.id,
            rawMeetingResults: meeting.meeting_results,
            resultsIsArray: Array.isArray(meeting.meeting_results),
            resultsLength: Array.isArray(meeting.meeting_results) ? meeting.meeting_results.length : 'not array'
          });
          
          return {
            ...meeting,
            teams: Array.isArray(meeting.teams) ? meeting.teams[0] : meeting.teams,
            // Fix: meeting_results can be an array from Supabase relationship, get first item
            meeting_results: Array.isArray(meeting.meeting_results) && meeting.meeting_results.length > 0 
              ? meeting.meeting_results[0] 
              : (meeting.meeting_results && !Array.isArray(meeting.meeting_results) ? meeting.meeting_results : null)
          };
        }) as PastMeeting[]);
      } catch (err: any) {
        logger.error('Error fetching past meetings:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPastMeetings();
  }, [user, currentCompany]);

  const formatDuration = (meeting: PastMeeting) => {
    if (!meeting.started_at || !meeting.ended_at) {
      return 'Unknown duration';
    }
    
    const startTime = new Date(meeting.started_at);
    const endTime = new Date(meeting.ended_at);
    const durationMs = endTime.getTime() - startTime.getTime();
    
    const minutes = Math.floor(durationMs / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${remainingMinutes}m`;
  };

  const getMeetingDurationMinutes = (meeting: PastMeeting): number => {
    // Use tracked duration from meeting results if available
    if (meeting.meeting_results?.total_duration_seconds) {
      return Math.floor(meeting.meeting_results.total_duration_seconds / 60);
    }
    
    // Fallback to timestamp calculation if no tracked duration
    if (!meeting.started_at || !meeting.ended_at) {
      return 0;
    }
    
    const startTime = new Date(meeting.started_at);
    const endTime = new Date(meeting.ended_at);
    const durationMs = endTime.getTime() - startTime.getTime();
    
    return Math.floor(durationMs / (1000 * 60));
  };

  const calculateMeetingMetrics = (meeting: PastMeeting) => {
    const results = meeting.meeting_results;
    
    logger.log('🔍 PastMeetingsList: Calculating metrics for meeting:', {
      meetingId: meeting.id,
      hasResults: !!results,
      meetingRatings: results?.meeting_ratings,
      ratingsType: typeof results?.meeting_ratings
    });
    
    // Calculate lowest rating
    let lowestRating = null;
    if (results?.meeting_ratings) {
      logger.log('🔍 PastMeetingsList: Processing ratings:', results.meeting_ratings);
      const ratings = Object.values(results.meeting_ratings)
        .filter((rating): rating is number => typeof rating === 'number' || !isNaN(Number(rating)))
        .map(rating => Number(rating));
      logger.log('🔍 PastMeetingsList: Filtered ratings:', ratings);
      if (ratings.length > 0) {
        lowestRating = Math.min(...ratings);
        logger.log('🔍 PastMeetingsList: Calculated lowest rating:', lowestRating);
      }
    }
    
    // Count issues resolved
    const issuesResolved = results?.issues_resolved?.length || 0;
    
    // Calculate total minutes on issue session
    let issueSessionMinutes = 0;
    if (results?.section_durations) {
      // For Tesla meetings, section 5 is "Issues"
      const durations = results.section_durations;
      if (durations['5']) { // Section 5: Issues (Tesla meeting)
        issueSessionMinutes = Math.round(durations['5'] / (1000 * 60));
      }
      // Also check for quarterly meetings structure if different
      if (durations['4']) { // Backup check for different meeting types
        issueSessionMinutes += Math.round(durations['4'] / (1000 * 60));
      }
    }
    
    return { lowestRating, issuesResolved, issueSessionMinutes };
  };

  const getMeetingTypeLabel = (type: string) => {
    switch (type) {
      case 'weekly': return 'Weekly';
      case 'quarterly': return 'Quarterly';
      case 'annual': return 'Annual';
      default: return type;
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    try {
      // Optimistic update
      setMeetings(prev => prev.filter(m => m.id !== meetingId));
      
      // Delete from database
      const { error: deleteError } = await supabase
        .from('meetings_state')
        .delete()
        .eq('id', meetingId);
      
      if (deleteError) throw deleteError;
      
      toast({
        title: "Meeting deleted",
        description: "The meeting has been successfully deleted.",
      });
    } catch (err: any) {
      logger.error('Error deleting meeting:', err);
      toast({
        title: "Error",
        description: "Failed to delete meeting. Please try again.",
        variant: "destructive",
      });
      // Revert optimistic update by refetching
      if (user && currentCompany) {
        // Trigger a refresh by calling the useEffect logic again
        window.location.reload();
      }
    } finally {
      setMeetingToDelete(null);
    }
  };
  
  // Filter meetings by duration
  const filteredMeetings = showShortMeetings 
    ? meetings 
    : meetings.filter(meeting => getMeetingDurationMinutes(meeting) > 5);
  
  const displayedMeetings = showAll ? filteredMeetings : filteredMeetings.slice(0, 5);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-[16px] font-medium text-foreground flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Past meetings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted rounded-[6px]"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-[16px] font-medium text-foreground flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Past meetings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-muted-foreground mb-2">Failed to load past meetings</p>
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (filteredMeetings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-[16px] font-medium text-foreground flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Past meetings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-[16px] font-medium mb-2">No past meetings</h3>
            <p className="text-muted-foreground">
              Past meetings will appear here once you've completed some
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-[16px] font-medium text-foreground flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Past meetings
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Short meetings toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowShortMeetings(!showShortMeetings)}
              className="text-muted-foreground hover:text-foreground h-8 px-2"
            >
              {showShortMeetings ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              <span className="ml-1 text-xs">
                {showShortMeetings ? 'Hide short' : 'Show short'}
              </span>
            </Button>
            {filteredMeetings.length > 5 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className="text-muted-foreground hover:text-foreground"
            >
              {showAll ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Show all {filteredMeetings.length}
                </>
              )}
            </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displayedMeetings.map((meeting) => {
            const metrics = calculateMeetingMetrics(meeting);
            
            return (
              <div
                key={meeting.id}
                className="flex items-center justify-between bg-card border border-border rounded-[6px] p-4 transition-colors duration-150 hover:bg-muted/30 cursor-pointer"
                onClick={() => setSelectedMeeting(meeting)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-foreground">
                        {meeting.teams.name}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {getMeetingTypeLabel(meeting.meeting_type)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-[11px] text-muted-foreground mt-1">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {meeting.ended_at 
                          ? formatDistanceToNow(new Date(meeting.ended_at), { addSuffix: true })
                          : formatDistanceToNow(new Date(meeting.created_at), { addSuffix: true })
                        }
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(meeting)}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-medium">
                      {metrics.issuesResolved}
                    </div>
                    <div className="text-xs text-muted-foreground">Issues Solved</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">
                      {metrics.issueSessionMinutes}m
                    </div>
                    <div className="text-xs text-muted-foreground">Issue Time</div>
                  </div>
                  {metrics.lowestRating !== null && (
                    <div className="text-center">
                      <div className={`font-medium ${metrics.lowestRating < 8 ? 'text-destructive' : ''}`}>
                        {metrics.lowestRating}
                      </div>
                      <div className="text-xs text-muted-foreground">Lowest Rating</div>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    aria-label="Delete meeting"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMeetingToDelete(meeting.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
      
      <AlertDialog open={!!meetingToDelete} onOpenChange={() => setMeetingToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Meeting</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this meeting? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => meetingToDelete && handleDeleteMeeting(meetingToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MeetingDetailsModal
        open={!!selectedMeeting}
        onOpenChange={(open) => !open && setSelectedMeeting(null)}
        meetingId={selectedMeeting?.id || null}
        teamName={selectedMeeting?.teams.name || ''}
        meetingType={selectedMeeting?.meeting_type || ''}
        meetingDate={selectedMeeting?.ended_at || selectedMeeting?.created_at || ''}
      />
    </Card>
  );
};