import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Settings, Plus, Clock, List, ArrowRight, Pencil, Trash2, ChevronDown, ChevronUp, MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCustomMeetingTemplates } from '@/hooks/meeting/useCustomMeetingTemplates';
import { useTemplateDelete } from '@/hooks/meeting/useTemplateDelete';
import { useAuth } from '@/contexts/AuthContext';
import { useOptimizedUserTeams } from '@/hooks/useOptimizedUserTeams';
import { useOptimizedActiveMeetings } from '@/hooks/meeting/useOptimizedActiveMeetings';
import { useOptimisticMeetingState } from '@/hooks/useOptimisticMeetingState';
import { TeamSelectionModal } from './TeamSelectionModal';
import { CustomMeetingTemplate } from '@/types/meeting';
import { supabase } from '@/integrations/supabase/client';
import { ensureWrapUpSection } from '@/utils/meetingSectionMapping';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { trackFBSQLOnce } from '@/utils/facebookTracking';

interface TemplateRowProps {
  template: CustomMeetingTemplate;
  onSelect: (templateId: string) => void;
  onEdit: (templateId: string) => void;
  onDelete: (templateId: string) => void;
  currentUserId: string | null;
}

const TemplateRow: React.FC<TemplateRowProps> = ({ 
  template, 
  onSelect, 
  onEdit, 
  onDelete, 
  currentUserId 
}) => {
  const isOwner = currentUserId && template.created_by === currentUserId;
  const totalDuration = template.sections.reduce((sum, section) => sum + (section.duration || 0), 0);
  const sectionCount = template.sections.length;

  return (
    <div
      className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer group"
      onClick={() => onSelect(template.id)}
    >
      <div className="flex items-center gap-3">
        {/* 3-dot menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
              onClick={(e) => e.stopPropagation()}
              aria-label="Meeting options"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
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

        {/* Duration and section count badges */}
        <div className="flex flex-col text-xs text-muted-foreground leading-tight gap-0.5 shrink-0">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 shrink-0" />
            <span>{totalDuration}m</span>
          </div>
          <div className="flex items-center gap-1">
            <List className="h-3 w-3 shrink-0" />
            <span>{sectionCount}s</span>
          </div>
        </div>
        
        {/* Template name and description */}
        <div className="flex flex-col min-w-0">
          <span className="font-medium text-foreground truncate">
            {template.name}
          </span>
          {template.description && (
            <span className="text-sm text-muted-foreground truncate">
              {template.description}
            </span>
          )}
        </div>
      </div>
      
      {/* Arrow indicator */}
      <div className="flex items-center">
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
    </div>
  );
};

export const CustomMeetingsBlock: React.FC = () => {
  const { templates, isLoading } = useCustomMeetingTemplates();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { deleteTemplate } = useTemplateDelete();
  
  const [showOnlyMyTemplates, setShowOnlyMyTemplates] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CustomMeetingTemplate | null>(null);
  const [showTeamSelection, setShowTeamSelection] = useState(false);
  
  // Get teams for team selection modal
  const { teams } = useOptimizedUserTeams();
  const { addOptimisticMeeting, forceRefetch } = useOptimizedActiveMeetings();
  const { setMeetingStarting, setMeetingStarted } = useOptimisticMeetingState();

  // Filter templates based on the checkbox
  const filteredTemplates = showOnlyMyTemplates
    ? templates.filter(template => template.created_by === user?.id)
    : templates;

  const displayedTemplates = showAll ? filteredTemplates : filteredTemplates.slice(0, 5);

  const handleCreateNew = () => {
    navigate('/meeting/custom/builder');
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
  };

  // Create optimistic meeting handler for team selection modal
  const handleOptimisticMeetingCreation = (teamId: string, teamName: string, meetingType: string) => {
    logger.log('🚀 Creating optimistic custom meeting from block:', {
      teamId,
      teamName,
      meetingType,
      templateId: selectedTemplate?.id
    });

    const optimisticEvent = new CustomEvent('optimistic-meeting-creation');
    window.dispatchEvent(optimisticEvent);

    const optimisticId = addOptimisticMeeting(teamId, teamName, meetingType);

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
        
      } catch (error) {
        logger.error('❌ Error starting custom meeting from template:', error);
        toast.error('Failed to start meeting');
        setMeetingStarted();
      }
    };
    
    createMeeting();
    return teamId;
  };

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Custom Meetings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state - no templates at all
  if (templates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Custom Meetings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No templates yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first custom meeting template
            </p>
            <Button onClick={handleCreateNew} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Create New Template
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Custom Meetings
            </CardTitle>
            <div className="flex items-center gap-3">
              {/* Only my templates checkbox */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="show-only-my-templates-block"
                  checked={showOnlyMyTemplates}
                  onCheckedChange={(checked) => setShowOnlyMyTemplates(checked === true)}
                />
                <Label htmlFor="show-only-my-templates-block" className="text-sm font-normal cursor-pointer text-muted-foreground">
                  Only my templates
                </Label>
              </div>
              
              {/* Show all toggle */}
              {filteredTemplates.length > 5 && (
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
                      Show all {filteredTemplates.length}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-8 px-4 border border-dashed rounded-lg">
                <p className="text-sm text-muted-foreground">
                  {showOnlyMyTemplates ? "You haven't created any templates yet" : "No templates available"}
                </p>
                <Button onClick={handleCreateNew} variant="outline" className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Template
                </Button>
              </div>
            ) : (
              <>
                {displayedTemplates.map((template) => (
                  <TemplateRow
                    key={template.id}
                    template={template}
                    onSelect={handleTemplateSelect}
                    onEdit={handleTemplateEdit}
                    onDelete={deleteTemplate}
                    currentUserId={user?.id || null}
                  />
                ))}
                
                {/* Create New Template button at bottom */}
                <div className="pt-2 border-t border-border mt-4">
                  <Button
                    onClick={handleCreateNew}
                    variant="ghost"
                    className="w-full justify-center text-muted-foreground hover:text-foreground"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Template
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Team Selection Modal */}
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
