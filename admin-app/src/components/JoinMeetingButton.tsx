import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Users, Calendar, Target, Loader2, ChevronDown, ChevronUp, AlertCircle, CalendarDays, Eye, EyeOff, Settings } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useUserTeamsResilient } from '@/hooks/useUserTeamsResilient';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { useNavigate, useLocation } from 'react-router-dom';
import { TeamSelectionModal } from '@/components/meeting/TeamSelectionModal';
import { useAllActiveMeetings } from '@/hooks/useAllActiveMeetings';
import { useOptimisticMeetingState } from '@/hooks/useOptimisticMeetingState';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { trackMeetingStarted } from '@/lib/analytics';
import { useCustomMeetingTemplates } from '@/hooks/meeting/useCustomMeetingTemplates';
import { CustomMeetingTemplate } from '@/types/meeting';
import { ensureWrapUpSection } from '@/utils/meetingSectionMapping';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { trackFBSQLOnce } from '@/utils/facebookTracking';
export const JoinMeetingButton = () => {
  const { user } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showTeamSelection, setShowTeamSelection] = useState(false);
  const [selectedMeetingType, setSelectedMeetingType] = useState<'weekly' | 'quarterly' | 'annual'>('weekly');
  const [isWeeklyExpanded, setIsWeeklyExpanded] = useState(false);
  const [isQuarterlyExpanded, setIsQuarterlyExpanded] = useState(false);
  const [isAnnualExpanded, setIsAnnualExpanded] = useState(false);
  const [isCustomExpanded, setIsCustomExpanded] = useState(false);
  
  // Custom meeting template state
  const [showOnlyMyTemplates, setShowOnlyMyTemplates] = useState(true);
  const [selectedCustomTemplate, setSelectedCustomTemplate] = useState<CustomMeetingTemplate | null>(null);
  const [showCustomTeamSelection, setShowCustomTeamSelection] = useState(false);

  // Cache teams locally to prevent flickering
  const [cachedTeams, setCachedTeams] = useState<any[]>([]);
  const [cachedMeetings, setCachedMeetings] = useState<any[]>([]);
  const hasLoadedTeamsOnce = useRef(false);
  const hasLoadedMeetingsOnce = useRef(false);

  // Only load data when dropdown is opened to prevent initial freeze
  const {
    teams,
    loading: teamsLoading
  } = useUserTeamsResilient();
  const {
    currentCompany
  } = useMultiCompanyAccess();
  const {
    meetings,
    loading: meetingsLoading,
    broadcastMeetingStarted
  } = useAllActiveMeetings();

  // Update cached teams when new data arrives
  useEffect(() => {
    if (teams.length > 0 && !teamsLoading) {
      setCachedTeams(teams);
      hasLoadedTeamsOnce.current = true;
    }
  }, [teams, teamsLoading]);

  // Update cached meetings when new data arrives - always sync to ensure real-time updates
  useEffect(() => {
    // Always update cache when meetings changes to ensure real-time sync
    setCachedMeetings(meetings);
    if (!meetingsLoading) {
      hasLoadedMeetingsOnce.current = true;
    }
  }, [meetings, meetingsLoading]);

  // Use cached data if available, otherwise use fresh data
  const displayTeams = cachedTeams.length > 0 ? cachedTeams : teams;
  const displayMeetings = hasLoadedMeetingsOnce.current ? cachedMeetings : meetings;

  // Only show loading on initial load, not on subsequent fetches
  const isInitialTeamsLoading = teamsLoading && !hasLoadedTeamsOnce.current;
  const isInitialMeetingsLoading = meetingsLoading && !hasLoadedMeetingsOnce.current;
  
  // Log component state for debugging
  logger.debug('JoinMeetingButton state', {
    meetingsCount: displayMeetings.length,
    meetingsLoading,
    teamsLoading,
    hasCurrentCompany: !!currentCompany
  });
  
  const {
    isStarting,
    startingTeamId,
    startingMeetingType,
    setMeetingStarting,
    setMeetingStarted,
    setMeetingError,
    isTeamMeetingStarting
  } = useOptimisticMeetingState();
  const navigate = useNavigate();
  const location = useLocation();

  // Check if user is currently in a meeting session
  const isInMeetingSession = location.pathname.startsWith('/meeting/');

  // Combined loading state - only show loading on initial load
  const loading = isInitialTeamsLoading || isInitialMeetingsLoading;
  
  // Custom meeting templates
  const { templates: customTemplates, isLoading: templatesLoading } = useCustomMeetingTemplates();
  
  // Filter templates based on "only my templates" toggle
  const filteredCustomTemplates = useMemo(() => {
    return showOnlyMyTemplates
      ? customTemplates.filter(template => template.created_by === user?.id)
      : customTemplates;
  }, [customTemplates, showOnlyMyTemplates, user?.id]);
  const handleWeeklyMeetingStart = useCallback(async (teamId: string) => {
    logger.debug('Starting weekly meeting', { teamId });
    
    // Trigger optimistic onboarding event FIRST
    logger.debug('Dispatching optimistic meeting creation event for onboarding');
    const optimisticEvent = new CustomEvent('optimistic-meeting-creation');
    window.dispatchEvent(optimisticEvent);
    
    // Set optimistic state immediately for instant UI feedback
    setMeetingStarting(teamId, 'weekly');
    logger.debug('Optimistic state set, navigating');

    // Track meeting start
    trackMeetingStarted('weekly');
    
    // NOTE: Broadcast is now sent AFTER DB insert in NewMeetingTimerContext
    // This follows the correct flow: User -> DB -> Realtime -> Users

    // Navigate immediately without delay
    navigate(`/meeting/${teamId}/weekly`);

    // Clear optimistic state immediately after navigation call
    setMeetingStarted();
  }, [setMeetingStarting, navigate, setMeetingStarted, broadcastMeetingStarted]);
  const handleQuarterlyMeetingStart = useCallback(async (teamId: string) => {
    logger.debug('Starting quarterly meeting', { teamId });
    
    // Trigger optimistic onboarding event FIRST
    logger.debug('Dispatching optimistic meeting creation event for onboarding');
    const optimisticEvent = new CustomEvent('optimistic-meeting-creation');
    window.dispatchEvent(optimisticEvent);
    
    // Set optimistic state immediately for instant UI feedback
    setMeetingStarting(teamId, 'quarterly');
    logger.debug('Optimistic state set, navigating');

    // Track meeting start
    trackMeetingStarted('quarterly');
    
    // NOTE: Broadcast is now sent AFTER DB insert in NewMeetingTimerContext
    // This follows the correct flow: User -> DB -> Realtime -> Users

    // Navigate immediately without delay
    navigate(`/meeting/${teamId}/quarterly`);

    // Clear optimistic state immediately after navigation call
    setMeetingStarted();
  }, [setMeetingStarting, navigate, setMeetingStarted, broadcastMeetingStarted]);

  const handleAnnualMeetingStart = useCallback(async (teamId: string) => {
    logger.debug('Starting annual meeting', { teamId });
    
    // Trigger optimistic onboarding event FIRST
    logger.debug('Dispatching optimistic meeting creation event for onboarding');
    const optimisticEvent = new CustomEvent('optimistic-meeting-creation');
    window.dispatchEvent(optimisticEvent);
    
    // Set optimistic state immediately for instant UI feedback
    setMeetingStarting(teamId, 'annual');
    logger.debug('Optimistic state set, navigating');

    // Track meeting start
    trackMeetingStarted('annual');
    
    // NOTE: Broadcast is now sent AFTER DB insert in NewMeetingTimerContext
    // This follows the correct flow: User -> DB -> Realtime -> Users

    // Navigate immediately without delay
    navigate(`/meeting/${teamId}/annual`);

    // Clear optimistic state immediately after navigation call
    setMeetingStarted();
  }, [setMeetingStarting, navigate, setMeetingStarted, broadcastMeetingStarted]);

  const handleCustomMeetingJoin = useCallback((teamId: string) => {
    logger.debug('Joining custom meeting', { teamId });
    
    // Trigger optimistic onboarding event
    logger.debug('Dispatching optimistic meeting join event');
    const optimisticEvent = new CustomEvent('optimistic-meeting-creation');
    window.dispatchEvent(optimisticEvent);
    
    // Set optimistic state for instant UI feedback
    setMeetingStarting(teamId, 'custom');
    logger.debug('Optimistic state set, navigating');

    // Navigate immediately
    navigate(`/meeting/${teamId}/custom`);

    // Clear optimistic state
    setMeetingStarted();
  }, [setMeetingStarting, navigate, setMeetingStarted]);

  // Handler for starting a custom meeting from a template
  const handleCustomMeetingStart = useCallback(async (template: CustomMeetingTemplate, teamId: string, teamName: string) => {
    if (!user) return;
    
    logger.debug('Starting custom meeting from template', { 
      templateId: template.id, 
      templateName: template.name, 
      teamId 
    });
    
    // Trigger optimistic onboarding event
    const optimisticEvent = new CustomEvent('optimistic-meeting-creation');
    window.dispatchEvent(optimisticEvent);
    
    // Set optimistic state for instant UI feedback
    setMeetingStarting(teamId, 'custom');
    
    try {
      const now = new Date().toISOString();
      const sectionsWithWrapUp = ensureWrapUpSection(template.sections);
      
      // Create meeting directly with template sections
      const { data, error } = await supabase
        .from('meetings_state')
        .insert({
          team_id: teamId,
          company_id: currentCompany?.id,
          status: 'active',
          started_at: now,
          started_by: user.id,
          scriber_id: null,
          meeting_type: 'custom',
          meeting_title: template.name,
          current_section: 0,
          section_start_time: now,
          section_durations: {},
          section_accumulated_times: {},
          is_paused: false,
          total_pause_duration: 0,
          role_assignments: {},
          custom_agenda: sectionsWithWrapUp,
          audience_type: 'team',
          selected_members: null
        })
        .select()
        .single();
      
      if (error) throw error;
      
      logger.debug('Custom meeting created successfully', { meetingId: data?.id });
      trackFBSQLOnce({
        userId: user.id,
        meetingId: data.id,
        companyId: currentCompany?.id,
        teamId,
        meetingType: 'custom',
      });
      
      // Get team name for broadcast
      const team = displayTeams.find(t => t.id === teamId);
      
      // ✅ HIGH-PERFORMANCE SYNC: Broadcast with full meeting data for instant sync
      broadcastMeetingStarted(teamId, 'custom', {
        id: data.id,
        team_id: teamId,
        team_name: teamName,
        company_name: currentCompany?.name || '',
        meeting_type: 'custom',
        current_section: 0,
        started_at: now,
        status: 'active',
        scriber_id: null
      });
      
      // Track meeting start
      trackMeetingStarted('custom');
      
      // Navigate to the meeting
      navigate(`/meeting/${teamId}/custom`, {
        state: {
          meetingType: 'custom',
          customAgenda: sectionsWithWrapUp,
          audienceType: 'team',
          templateId: template.id
        }
      });
      
      setMeetingStarted();
      setShowCustomTeamSelection(false);
      setSelectedCustomTemplate(null);
      
    } catch (error) {
      logger.error('Error starting custom meeting from template', { error });
      toast.error('Failed to start meeting');
      setMeetingStarted();
    }
  }, [user, currentCompany?.id, setMeetingStarting, setMeetingStarted, broadcastMeetingStarted, navigate]);

  const companyTeams = useMemo(() => {
    return displayTeams.filter(team => currentCompany ? team.company_id === currentCompany?.id : true);
  }, [displayTeams, currentCompany]);

  // Check for active meetings, including optimistic ones (memoized)
  const activeMeetings = useMemo(() => {
    return displayMeetings.filter(meeting => meeting.status === 'active');
  }, [displayMeetings]);

  const hasActiveMeeting = (activeMeetings.length > 0 || isStarting) && !isInitialMeetingsLoading;

  logger.debug('Active meetings check', {
    activeMeetingsCount: activeMeetings.length,
    hasActiveMeeting,
    meetingsLoading
  });

  // Simplified active meeting check
  const isTeamMeetingActive = (teamId: string, meetingType: string) => {
    const activeMeeting = activeMeetings.find(meeting => 
      meeting.team_id === teamId && meeting.meeting_type === meetingType
    );
    logger.debug('Team meeting check', { teamId, meetingType, isActive: !!activeMeeting });
    return !!activeMeeting;
  };

  // Check if team has a conflicting meeting type
  const getConflictingMeeting = (teamId: string, currentMeetingType: string) => {
    return activeMeetings.find(meeting => 
      meeting.team_id === teamId && 
      meeting.meeting_type !== currentMeetingType && 
      meeting.status === 'active'
    );
  };

  // Find the specific active meeting or optimistic one
  const getActiveMeeting = (teamId: string, meetingType: string) => {
    // Check for optimistic state first
    if (isTeamMeetingStarting(teamId, meetingType)) {
      return {
        isOptimistic: true
      };
    }

    // Check for real active meeting
    return activeMeetings.find(meeting => meeting.team_id === teamId && meeting.meeting_type === meetingType);
  };

  // When there's an active meeting or starting, show green button
  // If user is in a meeting session, show with special "In Meeting" indicator
  if (hasActiveMeeting || isInMeetingSession) {
    return <>
        <DropdownMenu onOpenChange={setIsDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="default" size="sm" className="text-sm font-medium px-3 py-1.5 h-8" title={isInMeetingSession ? "In Meeting" : "Join Active Meeting"} disabled={isStarting}>
              {isStarting ? <>
                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                  Starting...
                </> : <>
                  {isInMeetingSession ? (
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                      <span>In Meeting</span>
                    </div>
                  ) : (
                    <span>Join Meeting</span>
                  )}
                </>}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 shadow-lg z-[60]">
              {loading ? <DropdownMenuItem disabled>
                <span className="text-muted-foreground">Loading teams...</span>
              </DropdownMenuItem> : companyTeams.length === 0 ? <DropdownMenuItem disabled>
                <span className="text-muted-foreground">No teams available</span>
              </DropdownMenuItem> : <>
                {/* Weekly Meeting section header */}
                <div 
                  className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-b bg-muted/30 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsWeeklyExpanded(!isWeeklyExpanded);
                  }}
                >
                  <div className="flex items-center gap-2">
                    {activeMeetings.some(meeting => meeting.meeting_type === 'weekly') && (
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    )}
                    <span>Weekly Meeting</span>
                  </div>
                  {isWeeklyExpanded ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </div>
                
                {/* Team names for weekly meetings */}
                {isWeeklyExpanded && companyTeams.map(team => {
              const activeMeeting = getActiveMeeting(team.id, 'weekly');
              const isActiveOrStarting = !!activeMeeting;
              const isOptimisticStarting = activeMeeting && 'isOptimistic' in activeMeeting && activeMeeting.isOptimistic;
              // Check for active weekly meeting for this team
              const isReallyActive = activeMeetings.some(meeting => meeting.team_id === team.id && meeting.meeting_type === 'weekly');
              const conflictingMeeting = getConflictingMeeting(team.id, 'weekly');
              
              if (conflictingMeeting) {
                return (
                  <TooltipProvider key={team.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="px-2 py-1.5 pl-4 opacity-50">
                          <div className="flex items-center gap-2 w-full">
                            <AlertCircle className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">{team.name}</span>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>This team has an active {conflictingMeeting.meeting_type} meeting. Please end it before starting a weekly meeting.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              }
              
              return <DropdownMenuItem key={team.id} onClick={() => handleWeeklyMeetingStart(team.id)} className="cursor-pointer pl-4" disabled={isOptimisticStarting}>
                      <div className="flex items-center gap-2 w-full">
                        <Users className="h-4 w-4" />
                        <div className="flex flex-col flex-1">
                          <span className="font-medium">{team.name}</span>
                          {isActiveOrStarting && <span className="text-xs text-success dark:text-green-400 flex items-center gap-1">
                              {isOptimisticStarting ? <>
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  Starting...
                                </> : <>
                                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                  Active
                                </>}
                            </span>}
                        </div>
                        {isReallyActive && (
                          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
                        )}
                      </div>
                    </DropdownMenuItem>;
             })}
                
                {/* Separator before quarterly meeting */}
                <DropdownMenuSeparator />
                
                {/* Quarterly Meeting section header */}
                <div 
                  className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-b bg-muted/30 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsQuarterlyExpanded(!isQuarterlyExpanded);
                  }}
                >
                  <div className="flex items-center gap-2">
                    {activeMeetings.some(meeting => meeting.meeting_type === 'quarterly') && (
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    )}
                    <span>Quarterly Meeting</span>
                  </div>
                  {isQuarterlyExpanded ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </div>
                
                {/* Team names for quarterly meetings */}
                {isQuarterlyExpanded && companyTeams.map(team => {
              const activeMeeting = getActiveMeeting(team.id, 'quarterly');
              const isActiveOrStarting = !!activeMeeting;
              const isOptimisticStarting = activeMeeting && 'isOptimistic' in activeMeeting && activeMeeting.isOptimistic;
              const isReallyActive = activeMeetings.some(meeting => meeting.team_id === team.id && meeting.meeting_type === 'quarterly');
              const conflictingMeeting = getConflictingMeeting(team.id, 'quarterly');
              
              if (conflictingMeeting) {
                return (
                  <TooltipProvider key={team.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="px-2 py-1.5 pl-4 opacity-50">
                          <div className="flex items-center gap-2 w-full">
                            <AlertCircle className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">{team.name}</span>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>This team has an active {conflictingMeeting.meeting_type} meeting. Please end it before starting a quarterly meeting.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              }
              
              return <DropdownMenuItem key={team.id} onClick={() => handleQuarterlyMeetingStart(team.id)} className="cursor-pointer pl-4" disabled={isOptimisticStarting}>
                      <div className="flex items-center gap-2 w-full">
                        <Calendar className="h-4 w-4" />
                        <div className="flex flex-col flex-1">
                          <span className="font-medium">{team.name}</span>
                          {isActiveOrStarting && <span className="text-xs text-success dark:text-green-400 flex items-center gap-1">
                              {isOptimisticStarting ? <>
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  Starting...
                                </> : <>
                                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                  Active
                                </>}
                            </span>}
                        </div>
                        {isReallyActive && (
                          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
                        )}
                      </div>
                    </DropdownMenuItem>;
             })}
                 
                 {/* Separator before annual meeting */}
                 <DropdownMenuSeparator />
                 
                 {/* Annual Meeting section header */}
                 <div 
                   className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-b bg-muted/30 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
                   onClick={(e) => {
                     e.stopPropagation();
                     setIsAnnualExpanded(!isAnnualExpanded);
                   }}
                 >
                   <div className="flex items-center gap-2">
                     {activeMeetings.some(meeting => meeting.meeting_type === 'annual') && (
                       <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                     )}
                     <span>Annual Meeting</span>
                   </div>
                   {isAnnualExpanded ? (
                     <ChevronUp className="h-3 w-3" />
                   ) : (
                     <ChevronDown className="h-3 w-3" />
                   )}
                 </div>
                 
                 {/* Team names for annual meetings */}
                 {isAnnualExpanded && companyTeams.map(team => {
               const activeMeeting = getActiveMeeting(team.id, 'annual');
               const isActiveOrStarting = !!activeMeeting;
               const isOptimisticStarting = activeMeeting && 'isOptimistic' in activeMeeting && activeMeeting.isOptimistic;
               const isReallyActive = activeMeetings.some(meeting => meeting.team_id === team.id && meeting.meeting_type === 'annual');
               const conflictingMeeting = getConflictingMeeting(team.id, 'annual');
               
               if (conflictingMeeting) {
                 return (
                   <TooltipProvider key={team.id}>
                     <Tooltip>
                       <TooltipTrigger asChild>
                         <div className="px-2 py-1.5 pl-4 opacity-50">
                           <div className="flex items-center gap-2 w-full">
                             <AlertCircle className="h-4 w-4 text-muted-foreground" />
                             <span className="font-medium text-sm">{team.name}</span>
                           </div>
                         </div>
                       </TooltipTrigger>
                       <TooltipContent>
                         <p>This team has an active {conflictingMeeting.meeting_type} meeting. Please end it before starting an annual meeting.</p>
                       </TooltipContent>
                     </Tooltip>
                   </TooltipProvider>
                 );
               }
               
               return <DropdownMenuItem key={team.id} onClick={() => handleAnnualMeetingStart(team.id)} className="cursor-pointer pl-4" disabled={isOptimisticStarting}>
                       <div className="flex items-center gap-2 w-full">
                         <CalendarDays className="h-4 w-4" />
                         <div className="flex flex-col flex-1">
                           <span className="font-medium">{team.name}</span>
                           {isActiveOrStarting && <span className="text-xs text-success dark:text-green-400 flex items-center gap-1">
                               {isOptimisticStarting ? <>
                                   <Loader2 className="h-3 w-3 animate-spin" />
                                   Starting...
                                 </> : <>
                                   <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                   Active
                                 </>}
                             </span>}
                         </div>
                         {isReallyActive && (
                           <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
                         )}
                       </div>
                     </DropdownMenuItem>;
              })}
                 
                 {/* Custom Meeting section - always show for starting new custom meetings */}
                 <DropdownMenuSeparator />
                 
                 <div 
                   className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-b bg-muted/30 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
                   onClick={(e) => {
                     e.stopPropagation();
                     setIsCustomExpanded(!isCustomExpanded);
                   }}
                 >
                   <div className="flex items-center gap-2">
                     {activeMeetings.some(meeting => meeting.meeting_type === 'custom') && (
                       <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                     )}
                     <span>Custom Meeting</span>
                   </div>
                   <div className="flex items-center gap-1">
                     {/* Eye toggle for "Only my templates" */}
                     <TooltipProvider>
                       <Tooltip>
                         <TooltipTrigger asChild>
                           <button
                             onClick={(e) => {
                               e.stopPropagation();
                               setShowOnlyMyTemplates(!showOnlyMyTemplates);
                             }}
                             className="p-0.5 rounded hover:bg-muted"
                           >
                             {showOnlyMyTemplates ? (
                               <Eye className="h-3 w-3" />
                             ) : (
                               <EyeOff className="h-3 w-3" />
                             )}
                           </button>
                         </TooltipTrigger>
                          <TooltipContent side="left">
                            <p>{showOnlyMyTemplates ? 'Showing only my templates' : 'Showing all templates'}</p>
                          </TooltipContent>
                       </Tooltip>
                     </TooltipProvider>
                     {isCustomExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                   </div>
                 </div>
                 
                 {/* Active custom meetings */}
                 {isCustomExpanded && activeMeetings
                   .filter(meeting => meeting.meeting_type === 'custom')
                   .map(meeting => {
                     const isOptimisticStarting = isTeamMeetingStarting(meeting.team_id || meeting.id, 'custom');
                     
                     return (
                       <DropdownMenuItem 
                         key={meeting.id} 
                         onClick={() => handleCustomMeetingJoin(meeting.team_id || meeting.id)} 
                         className="cursor-pointer pl-4"
                         disabled={isOptimisticStarting}
                       >
                         <div className="flex items-center gap-2 w-full">
                           <Target className="h-4 w-4" />
                           <div className="flex flex-col flex-1">
                             <span className="font-medium">
                               {meeting.meeting_title || 'Custom Meeting'}
                             </span>
                             {meeting.team_name && (
                               <span className="text-xs text-muted-foreground">{meeting.team_name}</span>
                             )}
                             <span className="text-xs text-success dark:text-green-400 flex items-center gap-1">
                               {isOptimisticStarting ? (
                                 <>
                                   <Loader2 className="h-3 w-3 animate-spin" />
                                   Starting...
                                 </>
                               ) : (
                                 <>
                                   <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                   Active
                                 </>
                               )}
                             </span>
                           </div>
                           <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
                         </div>
                       </DropdownMenuItem>
                     );
                   })
                 }
                 
                 {/* Divider if there are active meetings */}
                 {isCustomExpanded && activeMeetings.some(meeting => meeting.meeting_type === 'custom') && filteredCustomTemplates.length > 0 && (
                   <div className="px-4 py-1 text-[10px] text-muted-foreground text-center border-t border-b bg-muted/20">
                     Start new
                   </div>
                 )}
                 
                 {/* Custom templates list */}
                 {isCustomExpanded && (
                   <>
                     {templatesLoading ? (
                       <div className="px-4 py-2 text-sm text-muted-foreground">Loading templates...</div>
                     ) : filteredCustomTemplates.length === 0 ? (
                       <div className="px-4 py-2 text-sm text-muted-foreground">
                         {showOnlyMyTemplates ? 'No templates created yet' : 'No templates available'}
                       </div>
                     ) : (
                        filteredCustomTemplates.map(template => (
                            <DropdownMenuItem
                              key={template.id}
                              onClick={() => {
                                setSelectedCustomTemplate(template);
                                setShowCustomTeamSelection(true);
                              }}
                              className="cursor-pointer pl-4"
                            >
                              <div className="flex items-center gap-2 w-full">
                                <Settings className="h-4 w-4" />
                                <span className="font-medium truncate">{template.name}</span>
                              </div>
                            </DropdownMenuItem>
                          ))
                        
                     )}
                   </>
                 )}
              </>}
          </DropdownMenuContent>
        </DropdownMenu>

        <TeamSelectionModal 
          open={showTeamSelection} 
          onOpenChange={setShowTeamSelection} 
          meetingType={selectedMeetingType} 
          teams={displayTeams}
          loading={loading}
        />
        
        {/* Team Selection Modal for Custom Meetings from Templates */}
        {showCustomTeamSelection && selectedCustomTemplate && (
          <TeamSelectionModal
            open={showCustomTeamSelection}
            onOpenChange={(open) => {
              setShowCustomTeamSelection(open);
              if (!open) setSelectedCustomTemplate(null);
            }}
            meetingType="custom"
            title={`Start "${selectedCustomTemplate.name}"`}
            description="Choose which team this custom meeting is for"
            onMeetingCreated={(teamId: string, teamName: string) => {
              handleCustomMeetingStart(selectedCustomTemplate, teamId, teamName);
              return teamId;
            }}
            teams={displayTeams}
            loading={loading}
          />
        )}
      </>;
  }

  // Default appearance when no meeting is active
  return <>
      <DropdownMenu onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost"
            className="h-8 px-3 text-sm font-medium hover:bg-muted/50 transition-colors flex items-center gap-2" 
            title="Start Meeting" 
            disabled={isStarting}
          >
            {isStarting ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="hidden sm:inline">Starting...</span>
              </>
            ) : (
              <>
                <span className="hidden sm:inline">Start Meeting</span>
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 shadow-lg z-[60]">
            {loading ? <DropdownMenuItem disabled>
                <span className="text-muted-foreground">Loading teams...</span>
              </DropdownMenuItem> : companyTeams.length === 0 ? <DropdownMenuItem disabled>
                <span className="text-muted-foreground">No teams available</span>
              </DropdownMenuItem> : <>
                {/* Weekly Meeting section header */}
                <div 
                  className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-b bg-muted/30 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsWeeklyExpanded(!isWeeklyExpanded);
                  }}
                >
                  <div className="flex items-center gap-2">
                    {activeMeetings.some(meeting => meeting.meeting_type === 'weekly') && (
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    )}
                    <span>Weekly Meeting</span>
                  </div>
                  {isWeeklyExpanded ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </div>
                
                {/* Team names for weekly meetings */}
                {isWeeklyExpanded && companyTeams.map(team => {
                // Check for active weekly meeting for this team
                const isActive = activeMeetings.some(meeting => meeting.team_id === team.id && meeting.meeting_type === 'weekly');
                const conflictingMeeting = getConflictingMeeting(team.id, 'weekly');
                
                if (conflictingMeeting) {
                  return (
                    <TooltipProvider key={team.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="px-2 py-1.5 pl-4 opacity-50">
                            <div className="flex items-center gap-2 w-full">
                              <AlertCircle className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium text-sm">{team.name}</span>
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>This team has an active {conflictingMeeting.meeting_type} meeting. Please end it before starting a weekly meeting.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                }
                
                return <DropdownMenuItem key={team.id} onClick={() => handleWeeklyMeetingStart(team.id)} className="cursor-pointer pl-4" disabled={isStarting}>
                  <div className="flex items-center gap-2 w-full">
                    <Users className="h-4 w-4" />
                    <div className="flex flex-col flex-1">
                      <span className="font-medium">{team.name}</span>
                      {isTeamMeetingStarting(team.id, 'weekly') && 
                        <span className="text-xs text-success flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Starting...
                        </span>
                      }
                      {isActive && (
                        <span className="text-xs text-success flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          Active
                        </span>
                      )}
                    </div>
                    {isActive && (
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
                    )}
                  </div>
                </DropdownMenuItem>
              })}
              
              {/* Separator before quarterly meeting */}
              <DropdownMenuSeparator />
              
                {/* Quarterly Meeting section header */}
                <div 
                  className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-b bg-muted/30 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsQuarterlyExpanded(!isQuarterlyExpanded);
                  }}
                >
                  <div className="flex items-center gap-2">
                    {activeMeetings.some(meeting => meeting.meeting_type === 'quarterly') && (
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    )}
                    <span>Quarterly Meeting</span>
                  </div>
                {isQuarterlyExpanded ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </div>
              
              {/* Team names for quarterly meetings */}
              {isQuarterlyExpanded && companyTeams.map(team => {
                const isActive = activeMeetings.some(meeting => meeting.team_id === team.id && meeting.meeting_type === 'quarterly');
                const conflictingMeeting = getConflictingMeeting(team.id, 'quarterly');
                
                if (conflictingMeeting) {
                  return (
                    <TooltipProvider key={team.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="px-2 py-1.5 pl-4 opacity-50">
                            <div className="flex items-center gap-2 w-full">
                              <AlertCircle className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium text-sm">{team.name}</span>
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>This team has an active {conflictingMeeting.meeting_type} meeting. Please end it before starting a quarterly meeting.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                }
                
                return <DropdownMenuItem key={team.id} onClick={() => handleQuarterlyMeetingStart(team.id)} className="cursor-pointer pl-4" disabled={isStarting}>
                  <div className="flex items-center gap-2 w-full">
                    <Calendar className="h-4 w-4" />
                    <div className="flex flex-col flex-1">
                      <span className="font-medium">{team.name}</span>
                      {isTeamMeetingStarting(team.id, 'quarterly') && 
                        <span className="text-xs text-success flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Starting...
                        </span>
                      }
                      {isActive && (
                        <span className="text-xs text-success flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          Active
                        </span>
                      )}
                    </div>
                    {isActive && (
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
                    )}
                  </div>
                </DropdownMenuItem>
              })}
              
              {/* Separator before annual meeting */}
              <DropdownMenuSeparator />
              
                {/* Annual Meeting section header */}
                <div 
                  className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-b bg-muted/30 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAnnualExpanded(!isAnnualExpanded);
                  }}
                >
                  <div className="flex items-center gap-2">
                    {activeMeetings.some(meeting => meeting.meeting_type === 'annual') && (
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    )}
                    <span>Annual Meeting</span>
                  </div>
                {isAnnualExpanded ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </div>
              
              {/* Team names for annual meetings */}
              {isAnnualExpanded && companyTeams.map(team => {
                const isActive = activeMeetings.some(meeting => meeting.team_id === team.id && meeting.meeting_type === 'annual');
                const conflictingMeeting = getConflictingMeeting(team.id, 'annual');
                
                if (conflictingMeeting) {
                  return (
                    <TooltipProvider key={team.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="px-2 py-1.5 pl-4 opacity-50">
                            <div className="flex items-center gap-2 w-full">
                              <AlertCircle className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium text-sm">{team.name}</span>
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>This team has an active {conflictingMeeting.meeting_type} meeting. Please end it before starting an annual meeting.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                }
                
                return <DropdownMenuItem key={team.id} onClick={() => handleAnnualMeetingStart(team.id)} className="cursor-pointer pl-4" disabled={isStarting}>
                  <div className="flex items-center gap-2 w-full">
                    <CalendarDays className="h-4 w-4" />
                    <div className="flex flex-col flex-1">
                      <span className="font-medium">{team.name}</span>
                      {isTeamMeetingStarting(team.id, 'annual') && 
                        <span className="text-xs text-success flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Starting...
                        </span>
                      }
                      {isActive && (
                        <span className="text-xs text-success flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          Active
                        </span>
                      )}
                    </div>
                    {isActive && (
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
                    )}
                  </div>
                </DropdownMenuItem>
              })}
                 
                 {/* Custom Meeting section - always show for starting new custom meetings */}
                 <DropdownMenuSeparator />
                 
                 <div 
                   className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-b bg-muted/30 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
                   onClick={(e) => {
                     e.stopPropagation();
                     setIsCustomExpanded(!isCustomExpanded);
                   }}
                 >
                   <div className="flex items-center gap-2">
                     {activeMeetings.some(meeting => meeting.meeting_type === 'custom') && (
                       <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                     )}
                     <span>Custom Meeting</span>
                   </div>
                   <div className="flex items-center gap-1">
                     {/* Eye toggle for "Only my templates" */}
                     <TooltipProvider>
                       <Tooltip>
                         <TooltipTrigger asChild>
                           <button
                             onClick={(e) => {
                               e.stopPropagation();
                               setShowOnlyMyTemplates(!showOnlyMyTemplates);
                             }}
                             className="p-0.5 rounded hover:bg-muted"
                           >
                             {showOnlyMyTemplates ? (
                               <Eye className="h-3 w-3" />
                             ) : (
                               <EyeOff className="h-3 w-3" />
                             )}
                           </button>
                         </TooltipTrigger>
                          <TooltipContent side="left">
                            <p>{showOnlyMyTemplates ? 'Showing only my templates' : 'Showing all templates'}</p>
                          </TooltipContent>
                       </Tooltip>
                     </TooltipProvider>
                     {isCustomExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                   </div>
                 </div>
                 
                 {/* Custom templates list */}
                 {isCustomExpanded && (
                   <>
                     {templatesLoading ? (
                       <div className="px-4 py-2 text-sm text-muted-foreground">Loading templates...</div>
                     ) : filteredCustomTemplates.length === 0 ? (
                       <div className="px-4 py-2 text-sm text-muted-foreground">
                         {showOnlyMyTemplates ? 'No templates created yet' : 'No templates available'}
                       </div>
                     ) : (
                        filteredCustomTemplates.map(template => (
                            <DropdownMenuItem
                              key={template.id}
                              onClick={() => {
                                setSelectedCustomTemplate(template);
                                setShowCustomTeamSelection(true);
                              }}
                              className="cursor-pointer pl-4"
                            >
                              <div className="flex items-center gap-2 w-full">
                                <Settings className="h-4 w-4" />
                                <span className="font-medium truncate">{template.name}</span>
                              </div>
                            </DropdownMenuItem>
                          ))
                        
                     )}
                   </>
                 )}
            </>}
        </DropdownMenuContent>
      </DropdownMenu>

      <TeamSelectionModal 
        open={showTeamSelection} 
        onOpenChange={setShowTeamSelection} 
        meetingType={selectedMeetingType} 
        teams={displayTeams}
        loading={loading}
      />
      
      {/* Team Selection Modal for Custom Meetings from Templates */}
      {showCustomTeamSelection && selectedCustomTemplate && (
        <TeamSelectionModal
          open={showCustomTeamSelection}
          onOpenChange={(open) => {
            setShowCustomTeamSelection(open);
            if (!open) setSelectedCustomTemplate(null);
          }}
          meetingType="custom"
          title={`Start "${selectedCustomTemplate.name}"`}
          description="Choose which team this custom meeting is for"
          onMeetingCreated={(teamId: string, teamName: string) => {
            handleCustomMeetingStart(selectedCustomTemplate, teamId, teamName);
            return teamId;
          }}
          teams={displayTeams}
          loading={loading}
        />
      )}
    </>;
};