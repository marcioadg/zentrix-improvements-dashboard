import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar, Zap, Target, ArrowRight, Play, Loader2, Star, Settings, MoreVertical, Pencil, Trash2, Clock, Plus } from 'lucide-react';
import { TeamSelectionModal } from '@/components/meeting/TeamSelectionModal';
import { CustomTemplateSelectionModal } from '@/components/meeting/CustomTemplateSelectionModal';
import { MeetingMembers } from '@/components/meeting/MeetingMembers';
import { useNavigate } from 'react-router-dom';
import { useOptimizedUserTeams } from '@/hooks/useOptimizedUserTeams';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { useOptimizedActiveMeetings } from '@/hooks/meeting/useOptimizedActiveMeetings';
import { useOptimisticMeetingState } from '@/hooks/useOptimisticMeetingState';
import { useCustomMeetingTemplates } from '@/hooks/meeting/useCustomMeetingTemplates';
import { useTemplateDelete } from '@/hooks/meeting/useTemplateDelete';
import { useAuth } from '@/contexts/AuthContext';
import { CustomMeetingTemplate } from '@/types/meeting';
import { ensureWrapUpSection } from '@/utils/meetingSectionMapping';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { trackFBSQLOnce } from '@/utils/facebookTracking';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Fixed meeting names - no user customization allowed
const MEETING_NAMES = {
  WEEKLY: 'Weekly Meeting',
  QUARTERLY: 'Quarterly Meeting',
  CUSTOM: 'Custom Meeting'
};

// Helper to format duration
const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

export const QuickStartMeetings = () => {
  const [showQuarterlyModal, setShowQuarterlyModal] = useState(false);
  const [showLeadershipModal, setShowLeadershipModal] = useState(false);
  const [showCustomTemplateModal, setShowCustomTemplateModal] = useState(false);
  const [showAnnualModal, setShowAnnualModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CustomMeetingTemplate | null>(null);
  const [showTemplateTeamModal, setShowTemplateTeamModal] = useState(false);
  
  const navigate = useNavigate();
  const { user } = useAuth();
  const { teams } = useOptimizedUserTeams();
  const { currentCompany } = useMultiCompanyAccess();
  const { meetings, addOptimisticMeeting, forceRefetch } = useOptimizedActiveMeetings();
  const { isStarting, startingMeetingType, setMeetingStarting, setMeetingStarted, setMeetingError } = useOptimisticMeetingState();
  const { templates } = useCustomMeetingTemplates();
  const { deleteTemplate } = useTemplateDelete();

  // Check for active meetings by type, including optimistic ones
  const activeLeadershipMeeting = meetings.find(meeting => meeting.status === 'active' && meeting.meeting_type === 'weekly');
  const activeQuarterlyMeeting = meetings.find(meeting => meeting.status === 'active' && meeting.meeting_type === 'quarterly');
  const activeAnnualMeeting = meetings.find(meeting => meeting.status === 'active' && meeting.meeting_type === 'annual');
  const activeCustomMeeting = meetings.find(meeting => meeting.status === 'active' && meeting.meeting_type === 'custom');

  // Include optimistic states
  const isLeadershipStarting = isStarting && startingMeetingType === 'weekly';
  const isQuarterlyStarting = isStarting && startingMeetingType === 'quarterly';
  const isAnnualStarting = isStarting && startingMeetingType === 'annual';
  const isCustomStarting = isStarting && startingMeetingType === 'custom';

  const handleAnnualMeeting = async () => {
    if (teams.length === 1) {
      const team = teams[0];
      if (activeAnnualMeeting && activeAnnualMeeting.team_id === team.id) {
        navigate(`/meeting/${activeAnnualMeeting.team_id}/annual`);
      } else {
        setMeetingStarting(team.id, 'annual');
        handleOptimisticMeetingCreation(team.id, team.name, 'annual');
        setTimeout(() => {
          navigate(`/meeting/${team.id}/annual`);
          setMeetingStarted();
        }, 500);
      }
    } else {
      setMeetingStarting('annual', 'annual');
      setShowAnnualModal(true);
    }
  };

  const handleLeadershipMeeting = async () => {
    if (teams.length === 1) {
      const team = teams[0];
      if (activeLeadershipMeeting && activeLeadershipMeeting.team_id === team.id) {
        navigate(`/meeting/${activeLeadershipMeeting.team_id}/weekly`);
      } else {
        setMeetingStarting(team.id, 'weekly');
        handleOptimisticMeetingCreation(team.id, team.name, 'weekly');
        setTimeout(() => {
          navigate(`/meeting/${team.id}/weekly`);
          setMeetingStarted();
        }, 500);
      }
    } else {
      setMeetingStarting('leadership', 'weekly');
      setShowLeadershipModal(true);
    }
  };

  const handleQuarterlyMeeting = async () => {
    if (teams.length === 1) {
      const team = teams[0];
      if (activeQuarterlyMeeting && activeQuarterlyMeeting.team_id === team.id) {
        navigate(`/meeting/${activeQuarterlyMeeting.team_id}/quarterly`);
      } else {
        setMeetingStarting(team.id, 'quarterly');
        handleOptimisticMeetingCreation(team.id, team.name, 'quarterly');
        setTimeout(() => {
          navigate(`/meeting/${team.id}/quarterly`);
          setMeetingStarted();
        }, 500);
      }
    } else {
      setMeetingStarting('quarterly', 'quarterly');
      setShowQuarterlyModal(true);
    }
  };

  // Create optimistic meeting handler for team selection modal
  const handleOptimisticMeetingCreation = (teamId: string, teamName: string, meetingType: string) => {
    logger.log('🚀 Creating optimistic meeting:', { teamId, teamName, meetingType });
    const optimisticEvent = new CustomEvent('optimistic-meeting-creation');
    window.dispatchEvent(optimisticEvent);
    const optimisticId = addOptimisticMeeting(teamId, teamName, meetingType);
    setTimeout(() => {
      forceRefetch();
    }, 1000);
    return optimisticId;
  };

  // Template handlers
  const handleTemplateClick = (template: CustomMeetingTemplate) => {
    setSelectedTemplate(template);
    if (teams.length === 1) {
      // Single team - start directly
      handleStartTemplateWithTeam(teams[0].id, teams[0].name, template);
    } else {
      setShowTemplateTeamModal(true);
    }
  };

  const handleTemplateEdit = (e: React.MouseEvent, templateId: string) => {
    e.stopPropagation();
    navigate(`/meeting/custom/builder?template=${templateId}`);
  };

  const handleTemplateDelete = (e: React.MouseEvent, templateId: string) => {
    e.stopPropagation();
    deleteTemplate(templateId);
  };

  const handleStartTemplateWithTeam = async (teamId: string, teamName: string, template: CustomMeetingTemplate) => {
    if (!user) return;
    
    setMeetingStarting(teamId, 'custom');
    handleOptimisticMeetingCreation(teamId, teamName, 'custom');
    
    try {
      const now = new Date().toISOString();
      const sectionsWithWrapUp = ensureWrapUpSection(template.sections);
      
      const { data, error } = await supabase
        .from('meetings_state')
        .insert({
          team_id: teamId,
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
      trackFBSQLOnce({
        userId: user.id,
        meetingId: data.id,
        teamId,
        meetingType: 'custom',
      });
      
      navigate(`/meeting/${teamId}/custom`, {
        state: {
          meetingType: 'custom',
          customAgenda: sectionsWithWrapUp,
          audienceType: 'team',
          templateId: template.id
        }
      });
      
      setMeetingStarted();
      setShowTemplateTeamModal(false);
      
    } catch (error) {
      logger.error('❌ Error starting custom meeting from template:', error);
      toast.error('Failed to start meeting');
      setMeetingStarted();
    }
  };

  const handleTemplateTeamSelect = (teamId: string, teamName: string, meetingType: string): string => {
    if (!selectedTemplate) return teamId;
    handleStartTemplateWithTeam(teamId, teamName, selectedTemplate);
    return teamId;
  };

  return (
    <>
      <div className="space-y-6">
        <div className="space-y-3" data-tour="meeting-grid">
          <h2 className="text-[16px] font-medium text-foreground">Start a meeting</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Weekly Meeting */}
            <button
              data-tour="card-weekly"
              onClick={handleLeadershipMeeting}
              disabled={teams.length === 0 || !currentCompany || isStarting}
              className="group relative bg-card border border-border rounded-[6px] p-4 transition-colors duration-150 hover:bg-muted/30 text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-muted group-hover:bg-muted-foreground/10 transition-colors">
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-[13px] font-medium text-foreground">{MEETING_NAMES.WEEKLY}</div>
                    <div className="text-[11px] text-muted-foreground">90 minutes</div>
                  </div>
                </div>
                
                {(activeLeadershipMeeting || isLeadershipStarting) ? (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-xs text-emerald-600 font-medium">
                      {isLeadershipStarting ? 'Starting...' : 'Active'}
                    </span>
                  </div>
                ) : (
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                )}
              </div>
              
              {(activeLeadershipMeeting || isLeadershipStarting) && (
                <div className="mt-3 pt-3 border-t border-border">
                  <MeetingMembers 
                    teamId={activeLeadershipMeeting?.team_id || null}
                    meetingType="weekly"
                    isActive={!!activeLeadershipMeeting}
                  />
                </div>
              )}
            </button>

            {/* Quarterly Meeting */}
            <button
              onClick={handleQuarterlyMeeting}
              disabled={teams.length === 0 || !currentCompany || isStarting}
              className="group relative bg-card border border-border rounded-[6px] p-4 transition-colors duration-150 hover:bg-muted/30 text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-muted group-hover:bg-muted-foreground/10 transition-colors">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-[13px] font-medium text-foreground">{MEETING_NAMES.QUARTERLY}</div>
                    <div className="text-[11px] text-muted-foreground">8 hours</div>
                  </div>
                </div>
                
                {(activeQuarterlyMeeting || isQuarterlyStarting) ? (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-xs text-emerald-600 font-medium">
                      {isQuarterlyStarting ? 'Starting...' : 'Active'}
                    </span>
                  </div>
                ) : (
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                )}
              </div>
              
              {(activeQuarterlyMeeting || isQuarterlyStarting) && (
                <div className="mt-3 pt-3 border-t border-border">
                  <MeetingMembers 
                    teamId={activeQuarterlyMeeting?.team_id || null}
                    meetingType="quarterly"
                    isActive={!!activeQuarterlyMeeting}
                  />
                </div>
              )}
            </button>

            {/* Annual Meeting */}
            <button
              onClick={handleAnnualMeeting}
              disabled={teams.length === 0 || !currentCompany || isStarting}
              className="group relative bg-card border border-border rounded-[6px] p-4 transition-colors duration-150 hover:bg-muted/30 text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-muted group-hover:bg-muted-foreground/10 transition-colors">
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-[13px] font-medium text-foreground">Annual Meeting</div>
                    <div className="text-[11px] text-muted-foreground">2-day planning</div>
                  </div>
                </div>
                
                {(activeAnnualMeeting || isAnnualStarting) ? (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-xs text-emerald-600 font-medium">
                      {isAnnualStarting ? 'Starting...' : 'Active'}
                    </span>
                  </div>
                ) : (
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                )}
              </div>
              
              {(activeAnnualMeeting || isAnnualStarting) && (
                <div className="mt-3 pt-3 border-t border-border">
                  <MeetingMembers 
                    teamId={activeAnnualMeeting?.team_id || null}
                    meetingType="annual"
                    isActive={!!activeAnnualMeeting}
                  />
                </div>
              )}
            </button>

            {/* Custom Meeting Button */}
            <button
              onClick={() => setShowCustomTemplateModal(true)}
              disabled={teams.length === 0 || !currentCompany || isStarting}
              className="group relative bg-card border border-border rounded-[6px] p-4 transition-colors duration-150 hover:bg-muted/30 text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-muted group-hover:bg-muted-foreground/10 transition-colors">
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-[13px] font-medium text-foreground">Custom Meeting</div>
                    <div className="text-[11px] text-muted-foreground">Build your own</div>
                  </div>
                </div>
                
                {(activeCustomMeeting || isCustomStarting) ? (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-xs text-emerald-600 font-medium">
                      {isCustomStarting ? 'Starting...' : 'Active'}
                    </span>
                  </div>
                ) : (
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                )}
              </div>
              
              {(activeCustomMeeting || isCustomStarting) && (
                <div className="mt-3 pt-3 border-t border-border">
                  <MeetingMembers 
                    teamId={activeCustomMeeting?.team_id || null}
                    meetingType="custom"
                    isActive={!!activeCustomMeeting}
                  />
                </div>
              )}
            </button>

            {/* Custom Template Cards */}
            {templates.map((template) => {
              const totalDuration = template.sections.reduce((sum, section) => sum + (section.duration || 0), 0);
              const isOwner = user?.id === template.created_by;
              
              return (
                <div
                  key={template.id}
                  className="group relative bg-card border border-border rounded-[6px] p-4 transition-colors duration-150 hover:bg-muted/30 text-left cursor-pointer"
                  onClick={() => handleTemplateClick(template)}
                >
                  {/* 3-dot menu - top left */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="absolute top-2 left-2 p-1 rounded text-muted-foreground/50 hover:text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onClick={(e) => handleTemplateEdit(e as unknown as React.MouseEvent, template.id)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      {isOwner && (
                        <DropdownMenuItem 
                          onClick={(e) => handleTemplateDelete(e as unknown as React.MouseEvent, template.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="p-2 rounded-md bg-muted group-hover:bg-muted-foreground/10 transition-colors shrink-0">
                        <Settings className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm text-foreground truncate">{template.name}</div>
                        <div className="text-[11px] text-muted-foreground">{formatDuration(totalDuration)}</div>
                      </div>
                    </div>
                    
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                  </div>
                </div>
              );
            })}
          </div>
          
          {teams.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {currentCompany ? `No teams in ${currentCompany?.name}` : 'No company selected'}
            </p>
          )}
        </div>
      </div>

      {/* Team Selection Modal for Weekly Meeting */}
      {showLeadershipModal && <TeamSelectionModal 
        open={showLeadershipModal} 
        onOpenChange={open => {
          setShowLeadershipModal(open);
          if (!open && isLeadershipStarting) {
            setMeetingStarted();
          }
        }} 
        meetingType="weekly"
        title="Select Team for Weekly Meeting" 
        description="Choose which team this weekly meeting is for" 
        onMeetingCreated={handleOptimisticMeetingCreation}
        teams={teams}
        loading={false}
      />}

      {/* Team Selection Modal for Quarterly Meeting */}
      {showQuarterlyModal && <TeamSelectionModal 
        open={showQuarterlyModal} 
        onOpenChange={open => {
          setShowQuarterlyModal(open);
          if (!open && isQuarterlyStarting) {
            setMeetingStarted();
          }
        }} 
        meetingType="quarterly" 
        title="Select Team for Quarterly Meeting" 
        description="Choose which team this quarterly planning meeting is for" 
        onMeetingCreated={handleOptimisticMeetingCreation}
        teams={teams}
        loading={false}
      />}

      {/* Team Selection Modal for Annual Meeting */}
      {showAnnualModal && <TeamSelectionModal 
        open={showAnnualModal} 
        onOpenChange={open => {
          setShowAnnualModal(open);
          if (!open && isAnnualStarting) {
            setMeetingStarted();
          }
        }} 
        meetingType="annual" 
        title="Select Team for Annual Meeting" 
        description="Choose which team this annual planning meeting is for" 
        onMeetingCreated={handleOptimisticMeetingCreation}
        teams={teams}
        loading={false}
      />}

      {/* Team Selection Modal for Template Meeting */}
      {showTemplateTeamModal && selectedTemplate && (
        <TeamSelectionModal
          open={showTemplateTeamModal}
          onOpenChange={(open) => {
            setShowTemplateTeamModal(open);
            if (!open) {
              setSelectedTemplate(null);
            }
          }}
          meetingType="custom"
          title={`Start "${selectedTemplate.name}"`}
          description="Choose which team this custom meeting is for"
          onMeetingCreated={handleTemplateTeamSelect}
          teams={teams}
          loading={false}
        />
      )}

      {/* Custom Template Selection Modal */}
      {showCustomTemplateModal && <CustomTemplateSelectionModal 
        open={showCustomTemplateModal} 
        onOpenChange={setShowCustomTemplateModal}
      />}
    </>
  );
};
