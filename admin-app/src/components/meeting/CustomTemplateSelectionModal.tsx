import React, { useState } from 'react';
import { BaseModal } from '@/components/modals/BaseModal';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useNavigate } from 'react-router-dom';
import { Settings, Plus, Clock, List, ArrowRight, Pencil, Trash2, MoreVertical } from 'lucide-react';
import { useTemplateDelete } from '@/hooks/meeting/useTemplateDelete';
import { useTemplateShare } from '@/hooks/meeting/useTemplateShare';
import { useCustomMeetingTemplates } from '@/hooks/meeting/useCustomMeetingTemplates';
import { useActiveCustomMeetings } from '@/hooks/meeting/useActiveCustomMeetings';
import { useAuth } from '@/contexts/AuthContext';
import { ActiveCustomMeetingCard } from './ActiveCustomMeetingCard';
import { TeamSelectionModal } from './TeamSelectionModal';
import { useOptimizedUserTeams } from '@/hooks/useOptimizedUserTeams';
import { useOptimizedActiveMeetings } from '@/hooks/meeting/useOptimizedActiveMeetings';
import { useOptimisticMeetingState } from '@/hooks/useOptimisticMeetingState';
import { CustomMeetingTemplate } from '@/types/meeting';
import { supabase } from '@/integrations/supabase/client';
import { ensureWrapUpSection } from '@/utils/meetingSectionMapping';
import { toast } from 'sonner';
import { useAllActiveMeetings } from '@/hooks/useAllActiveMeetings';
import { logger } from '@/utils/logger';
import { trackFBSQLOnce } from '@/utils/facebookTracking';

interface CustomTemplateSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TemplateButton: React.FC<{
  template: {
    id: string;
    name: string;
    description?: string;
    icon?: string;
    sections: any[];
    created_by?: string;
    shared?: boolean;
  };
  onSelect: (templateId: string) => void;
  onEdit: (templateId: string) => void;
  onDelete: (templateId: string) => void;
  onShareToggle: (templateId: string, shared: boolean) => void;
  currentUserId: string | null;
  isUpdatingShare: boolean;
}> = ({ template, onSelect, onEdit, onDelete, onShareToggle, currentUserId, isUpdatingShare }) => {
  const isOwner = currentUserId && template.created_by === currentUserId;
  const totalDuration = template.sections.reduce((sum, section) => sum + (section.duration || 0), 0);
  const sectionCount = template.sections.length;

  return (
    <Button
      variant="outline"
      className="w-full justify-start h-auto p-3 group hover:bg-accent"
      onClick={() => onSelect(template.id)}
    >
      <div className="flex items-center justify-between w-full gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* 3-dot menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-1 rounded hover:bg-muted transition-colors shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => onEdit(template.id)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              {isOwner && (
                <DropdownMenuItem 
                  onClick={() => onDelete(template.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex flex-col text-[10px] text-muted-foreground leading-tight gap-0.5 shrink-0">
            <div className="flex items-center gap-1">
              <Clock className="h-2.5 w-2.5 shrink-0" />
              <span>{totalDuration}m</span>
            </div>
            <div className="flex items-center gap-1">
              <List className="h-2.5 w-2.5 shrink-0" />
              <span>{sectionCount}s</span>
            </div>
          </div>
          <div className="text-left min-w-0 flex-1">
            <div className="font-medium truncate">{template.name}</div>
            {template.description && (
              <div className="text-xs text-muted-foreground truncate">{template.description}</div>
            )}
          </div>
        </div>
        
        {/* Share toggle - only for owners */}
        {isOwner && (
          <div 
            className="flex items-center gap-1.5 shrink-0 pl-2 border-l border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-[10px] text-muted-foreground">Share</span>
            <Switch
              checked={template.shared || false}
              onCheckedChange={(checked) => {
                onShareToggle(template.id, checked);
              }}
              disabled={isUpdatingShare}
              className="h-5 w-9 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input [&>span]:h-4 [&>span]:w-4 [&>span]:data-[state=checked]:translate-x-4"
            />
          </div>
        )}
      </div>
    </Button>
  );
};

export const CustomTemplateSelectionModal: React.FC<CustomTemplateSelectionModalProps> = ({
  open,
  onOpenChange,
}) => {
  const { templates, isLoading } = useCustomMeetingTemplates();
  const { customMeetings, isLoading: isLoadingMeetings } = useActiveCustomMeetings();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { deleteTemplate } = useTemplateDelete();
  const { updateSharedStatus, isUpdating: isUpdatingShare } = useTemplateShare();
  const [showOnlyMyTemplates, setShowOnlyMyTemplates] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<CustomMeetingTemplate | null>(null);
  const [showTeamSelection, setShowTeamSelection] = useState(false);
  
  // Get teams for team selection modal
  const { teams } = useOptimizedUserTeams();
  const { addOptimisticMeeting, forceRefetch } = useOptimizedActiveMeetings();
  const { setMeetingStarting, setMeetingStarted } = useOptimisticMeetingState();
  const { broadcastMeetingStarted } = useAllActiveMeetings();

  // Filter templates: always show only owned OR shared templates
  // The checkbox further filters to just owned templates
  const visibleTemplates = templates.filter(
    template => template.created_by === user?.id || template.shared === true
  );
  const filteredTemplates = showOnlyMyTemplates
    ? visibleTemplates.filter(template => template.created_by === user?.id)
    : visibleTemplates;

  const handleCreateNew = () => {
    navigate('/meeting/custom/builder');
    onOpenChange(false);
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      setShowTeamSelection(true);
    }
  };

  const handleTemplateEdit = (templateId: string) => {
    navigate(`/meeting/custom/builder?template=${templateId}`);
    onOpenChange(false);
  };

  const handleJoinMeeting = (teamId: string) => {
    navigate(`/meeting/${teamId}/custom`);
    onOpenChange(false);
  };

  // Create optimistic meeting handler for team selection modal (same as QuickStartMeetings)
  const handleOptimisticMeetingCreation = (teamId: string, teamName: string, meetingType: string) => {
    logger.log('🚀 Creating optimistic custom meeting:', {
      teamId,
      teamName,
      meetingType,
      templateId: selectedTemplate?.id
    });

    // Trigger optimistic onboarding event
    const optimisticEvent = new CustomEvent('optimistic-meeting-creation');
    window.dispatchEvent(optimisticEvent);

    // Add optimistic meeting immediately
    const optimisticId = addOptimisticMeeting(teamId, teamName, meetingType);

    // Force immediate refetch to get real data
    setTimeout(() => {
      forceRefetch();
    }, 1000);
    
    return optimisticId;
  };

  // Handle team selection - start the custom meeting with template
  const handleTeamSelect = (teamId: string, teamName: string, meetingType: string): string => {
    if (!selectedTemplate || !user) return teamId;
    
    setMeetingStarting(teamId, 'custom');
    handleOptimisticMeetingCreation(teamId, teamName, meetingType);
    
    // Start async meeting creation (fire and forget pattern)
    const createMeeting = async () => {
      try {
        const now = new Date().toISOString();
        const sectionsWithWrapUp = ensureWrapUpSection(selectedTemplate.sections);
        
        logger.log('📋 Creating custom meeting with template sections:', {
          templateId: selectedTemplate.id,
          templateName: selectedTemplate.name,
          sectionCount: sectionsWithWrapUp.length,
          sections: sectionsWithWrapUp.map(s => s.title)
        });
        
        // Create meeting directly with template sections (like MeetingBuilder does)
        const { data, error } = await supabase
          .from('meetings_state')
          .insert({
            team_id: teamId,
            status: 'active',
            started_at: now,
            started_by: user.id,
            scriber_id: null,
            meeting_type: 'custom',
            meeting_title: selectedTemplate.name,
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
        
        logger.log('✅ Custom meeting created successfully:', data?.id);
        
        // NOTE: custom_meeting_started event is now tracked in TeamSelectionModal
        // when the user clicks the team button (immediate trigger on user action)
        
        // HIGH-PERFORMANCE SYNC: Broadcast with full meeting data for instant sync
        if (broadcastMeetingStarted) {
          logger.log('📤 CustomTemplateSelectionModal: Broadcasting meeting_started after DB insert');
          broadcastMeetingStarted(teamId, 'custom', {
            id: data.id,
            team_id: teamId,
            team_name: teamName,
            company_name: '',
            meeting_type: 'custom',
            current_section: 0,
            started_at: now,
            status: 'active',
            scriber_id: null
          });
        }
        
        // Navigate with template info in state
        navigate(`/meeting/${teamId}/custom`, {
          state: {
            meetingType: 'custom',
            customAgenda: sectionsWithWrapUp,
            audienceType: 'team',
            templateId: selectedTemplate.id
          }
        });
        
        setMeetingStarted();
        setShowTeamSelection(false);
        onOpenChange(false);
        
      } catch (error) {
        logger.error('❌ Error starting custom meeting from template:', error);
        toast.error('Failed to start meeting');
        setMeetingStarted();
      }
    };
    
    createMeeting();
    return teamId;
  };

  return (
    <>
      <BaseModal
        open={open}
        onOpenChange={onOpenChange}
        title="Custom Meeting"
        description="Select a template or create a new custom meeting"
        hideActions={true}
      >
        <div className="space-y-4">
          {/* Active Custom Meetings Section */}
          {isLoadingMeetings ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground text-sm">Loading active meetings...</p>
            </div>
          ) : customMeetings.length > 0 ? (
            <>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span className="flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  Active Meetings
                </div>
                {customMeetings.map((meeting) => (
                  <ActiveCustomMeetingCard
                    key={meeting.id}
                    meeting={meeting}
                    onJoin={handleJoinMeeting}
                  />
                ))}
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or start a new meeting
                  </span>
                </div>
              </div>
            </>
          ) : null}

          {/* Templates Section - Now FIRST */}
          {isLoading ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground">Loading templates...</p>
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8">
              <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No templates yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first custom meeting template
              </p>
            </div>
          ) : (
            <>
              {/* Filter Checkbox */}
              <div className="flex items-center justify-end gap-2">
                <Checkbox
                  id="show-only-my-templates-modal"
                  checked={showOnlyMyTemplates}
                  onCheckedChange={(checked) => setShowOnlyMyTemplates(checked === true)}
                />
                <Label htmlFor="show-only-my-templates-modal" className="text-sm font-normal cursor-pointer">
                  Only my templates
                </Label>
              </div>

              {/* Template List with scroll */}
              <div className="max-h-[280px] overflow-y-auto space-y-3 pr-1">
                {filteredTemplates.length === 0 ? (
                  <div className="text-center py-8 px-4 border border-dashed rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      {showOnlyMyTemplates ? "You haven't created any templates yet" : "No templates available"}
                    </p>
                  </div>
                ) : (
                  filteredTemplates.map((template) => (
                    <TemplateButton
                      key={template.id}
                      template={template}
                      onSelect={handleTemplateSelect}
                      onEdit={handleTemplateEdit}
                      onDelete={deleteTemplate}
                      onShareToggle={(templateId, shared) => updateSharedStatus({ templateId, shared })}
                      currentUserId={user?.id || null}
                      isUpdatingShare={isUpdatingShare}
                    />
                  ))
                )}
              </div>
            </>
          )}

          {/* Divider before Create button */}
          {templates.length > 0 && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or create new
                </span>
              </div>
            </div>
          )}

          {/* Create New Template Button - Now at the BOTTOM */}
          <Button
            onClick={handleCreateNew}
            variant="outline"
            className="w-full h-auto p-4"
            size="lg"
          >
            <div className="flex items-center space-x-2">
              <Plus className="h-5 w-5" />
              <span className="font-medium">Create New Template</span>
            </div>
          </Button>
        </div>
      </BaseModal>

      {/* Team Selection Modal - Opens when clicking on a template */}
      {showTeamSelection && selectedTemplate && (
        <TeamSelectionModal
          open={showTeamSelection}
          onOpenChange={(open) => {
            setShowTeamSelection(open);
            if (!open) {
              setSelectedTemplate(null);
            }
          }}
          meetingType="custom"
          title={`Start "${selectedTemplate.name}"`}
          description="Choose which team this custom meeting is for"
          onMeetingCreated={handleTeamSelect}
          teams={teams}
          loading={false}
        />
      )}
    </>
  );
};
