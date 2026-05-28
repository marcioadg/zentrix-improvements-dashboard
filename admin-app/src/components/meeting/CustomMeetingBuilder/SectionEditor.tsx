import { AgendaItem } from '@/types/meeting';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from './RichTextEditor';
import { GoodNewsSection } from '../GoodNewsSection';
import { FullMeetingMetrics } from '../FullMeetingMetrics';
import { TeamGoalReviewSection } from '../TeamGoalReviewSection';
import { IssuesSection } from '../IssuesSection';
import { TeamTasksStandupSection } from '../TeamTasksStandupSection';
import { HeadlinesSection } from '../HeadlinesSection';
import { TeamUpdatesSection } from '../TeamUpdatesSection';
import { WrapUpSection } from '../WrapUpSection';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Settings as SettingsIcon, SlidersHorizontal, FileDown, GripVertical, BarChart3, Star, AlertTriangle, Plus } from 'lucide-react';
import { QuarterlyCheckInSection } from '../quarterly/QuarterlyCheckInSection';
import { QuarterlyReviewPriorQuarterSection } from '../quarterly/QuarterlyReviewPriorQuarterSection';
import QuarterlyStrategySection from '../quarterly/QuarterlyStrategySection';
import { QuarterlyGoalsSection } from '../quarterly/QuarterlyGoalsSection';
import { QuarterlyToolsSection } from '../quarterly/QuarterlyToolsSection';
import { useOptimizedUserTeams } from '@/hooks/useOptimizedUserTeams';
import { useUnifiedTeamTasks } from '@/hooks/useUnifiedTeamTasks';

interface SectionEditorProps {
  section: AgendaItem | null;
  onCancel: () => void;
  onUpdate?: (updates: Partial<AgendaItem>) => void;
  selectedTeamId?: string;
  audienceType?: 'team' | 'members';
}

// Preview wrapper that fetches real task data
const TasksPreviewWrapper = ({ 
  teamId, 
  meetingId, 
  audienceType 
}: { 
  teamId: string; 
  meetingId: string; 
  audienceType: 'team' | 'members';
}) => {
  // Fetch real tasks for the selected team(s)
  const {
    tasks,
    loading,
    updateTask,
    deleteTask,
  } = useUnifiedTeamTasks(
    teamId ? [teamId] : [], // Pass as array for the hook
    null // No active meeting for preview
  );

  return (
    <TeamTasksStandupSection 
      meetingId={meetingId}
      teamId={teamId}
      tasks={tasks}
      loading={loading}
      onTaskUpdate={updateTask}
      onTaskDelete={deleteTask}
    />
  );
};

export const SectionEditor = ({ section, onCancel, onUpdate, selectedTeamId, audienceType = 'team' }: SectionEditorProps) => {
  if (!section) return null;

  const handleCustomTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onUpdate) {
      onUpdate({ title: e.target.value });
    }
  };

  const handleCustomDescriptionChange = (value: string) => {
    if (onUpdate) {
      onUpdate({ customDescription: value });
    }
  };

  // Mock IDs for preview purposes only
  const mockTeamId = 'preview-team-id';
  const mockMeetingId = 'preview-meeting-id';
  
  // Get user teams for metrics preview fallback
  const { teams } = useOptimizedUserTeams();

  // Render section preview based on type
  const renderSectionPreview = () => {
    const sectionType = section?.type?.toLowerCase();

    switch (sectionType) {
      case 'good_news':
        return (
          <div className="min-h-[300px] max-h-[600px] overflow-y-auto">
            <GoodNewsSection teamId={mockTeamId} />
          </div>
        );
      
      case 'check_in':
        return <QuarterlyCheckInSection teamId={mockTeamId} />;
      
      case 'review_prior_quarter':
        return selectedTeamId ? (
          <QuarterlyReviewPriorQuarterSection 
            teamId={selectedTeamId}
          />
        ) : (
          <div className="flex items-center justify-center min-h-[300px] border border-dashed border-border rounded-lg bg-muted/20">
            <p className="text-muted-foreground">Please select a team to preview</p>
          </div>
        );
      
      case 'review_strategy':
      case 'review_strategy/execution':
        return <QuarterlyStrategySection />;
      
      case 'quarterly_goals':
        return <QuarterlyGoalsSection />;
      
      case 'tools_review':
        return selectedTeamId ? (
          <QuarterlyToolsSection teamId={selectedTeamId} />
        ) : (
          <div className="flex items-center justify-center min-h-[300px] border border-dashed border-border rounded-lg bg-muted/20">
            <p className="text-muted-foreground">Please select a team to preview tools</p>
          </div>
        );
      
      case 'metrics':
        // Use selected team if available, otherwise first team from user's teams
        const teamIdForPreview = selectedTeamId || teams[0]?.id;
        
        // Only render if we have a valid team ID (never pass invalid UUIDs to database)
        if (!teamIdForPreview) {
          return (
            <div className="flex items-center justify-center min-h-[300px] border border-dashed border-border rounded-lg bg-muted/20">
              <div className="text-center space-y-2">
                <p className="text-lg font-medium text-muted-foreground">No Teams Available</p>
                <p className="text-sm text-muted-foreground">
                  You need to be part of at least one team to preview metrics
                </p>
              </div>
            </div>
          );
        }
        
        return <FullMeetingMetrics teamId={teamIdForPreview} />;
      
      case 'goals':
        return selectedTeamId ? (
          <TeamGoalReviewSection 
            meetingId={mockMeetingId}
            teamId={selectedTeamId}
          />
        ) : (
          <div className="flex items-center justify-center min-h-[300px] border border-dashed border-border rounded-lg bg-muted/20">
            <p className="text-muted-foreground">
              Please select a team to preview goals
            </p>
          </div>
        );
      
      case 'issues':
        return selectedTeamId ? (
          <IssuesSection 
            meetingId={mockMeetingId}
            teamId={selectedTeamId}
          />
        ) : (
          <div className="flex items-center justify-center min-h-[300px] border border-dashed border-border rounded-lg bg-muted/20">
            <p className="text-muted-foreground text-sm">Please select a team to preview issues</p>
          </div>
        );
      
      case 'next_steps':
      case 'tasks':
        // Determine which team ID to use for fetching
        const taskTeamId = selectedTeamId || teams[0]?.id;
        
        // Only render if we have a valid team ID
        if (!taskTeamId && audienceType !== 'members') {
          return (
            <div className="flex items-center justify-center min-h-[300px] border border-dashed border-border rounded-lg bg-muted/20">
              <div className="text-center space-y-2">
                <p className="text-lg font-medium text-muted-foreground">No Teams Available</p>
                <p className="text-sm text-muted-foreground">
                  You need to be part of at least one team to preview tasks
                </p>
              </div>
            </div>
          );
        }
        
        // Render the component that fetches real tasks
        return <TasksPreviewWrapper 
          teamId={taskTeamId || ''}
          meetingId={mockMeetingId}
          audienceType={audienceType}
        />;
      
      case 'headlines':
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Headlines
              </h2>
              <p className="text-secondary-foreground font-medium">
                Share important updates about clients or team members
              </p>
            </div>

            {/* Add headline button (visual only) */}
            <div className="space-y-3">
              <div className="w-full text-left p-4 border-2 border-dashed border-border bg-card">
                <div className="flex items-center gap-2 text-secondary-foreground">
                  <Plus className="h-4 w-4" />
                  <span className="font-medium">Add Headline</span>
                </div>
              </div>
            </div>

          </div>
        );
      
      case 'team_updates':
        return <TeamUpdatesSection meetingId={mockMeetingId} teamId={mockTeamId} />;
      
      case 'wrap_up':
        return (
          <div className="space-y-4 p-6 border border-dashed border-border rounded-lg bg-muted/20">
            <div className="text-center">
              <h4 className="font-semibold text-foreground mb-2">Meeting Wrap-Up</h4>
              <p className="text-sm text-muted-foreground">Available during active meetings</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-lg bg-card border border-border">
                <Star className="w-5 h-5 mb-2 text-primary" />
                <p className="text-xs font-medium text-foreground">Meeting Rating</p>
                <p className="text-xs text-muted-foreground mt-1">Team satisfaction score</p>
              </div>
              <div className="p-4 rounded-lg bg-card border border-border">
                <AlertTriangle className="w-5 h-5 mb-2 text-primary" />
                <p className="text-xs font-medium text-foreground">New Tasks Created</p>
                <p className="text-xs text-muted-foreground mt-1">Summary of action items</p>
              </div>
              <div className="p-4 rounded-lg bg-card border border-border">
                <BarChart3 className="w-5 h-5 mb-2 text-primary" />
                <p className="text-xs font-medium text-foreground">Meeting Metrics</p>
                <p className="text-xs text-muted-foreground mt-1">Duration and attendance</p>
              </div>
            </div>
          </div>
        );
      
      case 'custom_section':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Section Title *
                </label>
                <Input
                  value={section.title === 'Custom Section' ? '' : section.title}
                  onChange={handleCustomTitleChange}
                  placeholder="Add a Section Title for this section..."
                  maxLength={50}
                  className="text-lg"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {section.title === 'Custom Section' ? 0 : section.title.length}/50 characters
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Description (optional)
                </label>
                <RichTextEditor
                  value={section.customDescription || ''}
                  onChange={handleCustomDescriptionChange}
                  placeholder="Add a description for this section..."
                  maxLength={200}
                />
              </div>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
            <p className="text-sm font-medium">{section.title}</p>
            <p className="text-xs mt-2">Custom section preview</p>
          </div>
        );
    }
  };

  return (
    <div className="h-full border border-border rounded-lg bg-card overflow-hidden">
      <div className="h-full overflow-y-auto p-6">
        {renderSectionPreview()}
      </div>
    </div>
  );
};
