import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SECTION_LIBRARY, SectionTemplate } from '@/utils/meetingSectionMapping';
import { Plus, Calendar, CalendarDays, CalendarRange } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

// Weekly meeting default sections
const WEEKLY_SECTIONS: SectionTemplate[] = [
  { id: 'good_news', title: 'Good News', defaultDuration: 5, type: 'good_news', description: 'Share positive updates' },
  { id: 'metrics', title: 'Metrics', defaultDuration: 5, type: 'metrics', description: 'Review key metrics' },
  { id: 'goals', title: 'Goals', defaultDuration: 5, type: 'goals', description: 'Discuss goals and progress' },
  { id: 'headlines', title: 'Headlines', defaultDuration: 5, type: 'headlines', description: 'Quick updates from teams' },
  { id: 'tasks', title: 'Tasks', defaultDuration: 5, type: 'tasks', description: 'Review action items' },
  { id: 'issues', title: 'Issues', defaultDuration: 60, type: 'issues', description: 'Solve problems together' },
  { id: 'wrap_up', title: 'Wrap Up', defaultDuration: 5, type: 'wrap_up', description: 'Conclude the meeting', required: true },
];

// Quarterly meeting default sections
const QUARTERLY_SECTIONS: SectionTemplate[] = [
  { id: 'check_in', title: 'Check-In', defaultDuration: 15, type: 'check_in', description: 'Team check-in session' },
  { id: 'review_prior_quarter', title: 'Review Prior Quarter', defaultDuration: 30, type: 'review_prior_quarter', description: 'Quarterly retrospective' },
  { id: 'review_strategy', title: 'Review Strategy/Execution', defaultDuration: 60, type: 'review_strategy', description: 'Strategic planning' },
  { id: 'tools_review', title: 'Tools Review', defaultDuration: 60, type: 'tools_review', description: 'Review systems and tools' },
  { id: 'goals', title: 'Quarterly Goals', defaultDuration: 120, type: 'goals', description: 'Set quarterly objectives' },
  { id: 'issues', title: 'Issues', defaultDuration: 180, type: 'issues', description: 'Solve problems together' },
  { id: 'next_steps', title: 'Next Steps', defaultDuration: 7, type: 'next_steps', description: 'Define action items' },
  { id: 'wrap_up', title: 'Wrap Up', defaultDuration: 8, type: 'wrap_up', description: 'Conclude the meeting', required: true },
];

// Annual meeting default sections (Day 1 + Day 2)
const ANNUAL_SECTIONS: SectionTemplate[] = [
  // Day 1
  { id: 'annual_opening', title: 'Opening & Check-In', defaultDuration: 30, type: 'annual_opening', description: 'Welcome and team check-in' },
  { id: 'annual_review_prior_year', title: 'Review Prior Year', defaultDuration: 30, type: 'annual_review_prior_year', description: 'Reflect on the past year' },
  { id: 'annual_team_building', title: 'Team Building', defaultDuration: 180, type: 'annual_team_building', description: 'Strengthen team bonds' },
  { id: 'annual_company_assessment', title: 'Company Assessment', defaultDuration: 60, type: 'annual_company_assessment', description: 'Assess company health' },
  { id: 'annual_strategic_analysis', title: 'SWOT Analysis', defaultDuration: 60, type: 'annual_strategic_analysis', description: 'Strategic analysis' },
  { id: 'annual_vision_review', title: 'Strategy Review', defaultDuration: 60, type: 'annual_vision_review', description: 'Review company vision' },
  { id: 'annual_three_year_goals', title: '3-Year Goals', defaultDuration: 60, type: 'annual_three_year_goals', description: 'Long-term goal setting' },
  // Day 2
  { id: 'annual_day2_opening', title: 'Day 2 Opening', defaultDuration: 15, type: 'annual_day2_opening', description: 'Day 2 kickoff' },
  { id: 'annual_review_issues', title: 'Review 3-Year Plan & Key Challenges', defaultDuration: 15, type: 'annual_review_issues', description: 'Review key challenges' },
  { id: 'annual_plan', title: 'Annual Plan', defaultDuration: 120, type: 'annual_plan', description: 'Set annual objectives' },
  { id: 'annual_90_day_priorities', title: 'Quarterly Focus', defaultDuration: 120, type: 'annual_90_day_priorities', description: '90-day priorities' },
  { id: 'annual_problem_solving', title: 'Issues', defaultDuration: 200, type: 'annual_problem_solving', description: 'Solve key problems' },
  { id: 'wrap_up', title: 'Wrap Up', defaultDuration: 10, type: 'wrap_up', description: 'Conclude the meeting', required: true },
];

interface MeetingPreset {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  sections: SectionTemplate[];
}

const MEETING_PRESETS: MeetingPreset[] = [
  {
    id: 'weekly',
    title: 'Weekly Meeting',
    description: '7 sections • 90 min',
    icon: <Calendar className="h-4 w-4 text-primary" />,
    sections: WEEKLY_SECTIONS,
  },
  {
    id: 'quarterly',
    title: 'Quarterly Meeting',
    description: '8 sections • 8 hours',
    icon: <CalendarDays className="h-4 w-4 text-primary" />,
    sections: QUARTERLY_SECTIONS,
  },
  {
    id: 'annual',
    title: 'Annual Meeting',
    description: '13 sections • 2 days',
    icon: <CalendarRange className="h-4 w-4 text-primary" />,
    sections: ANNUAL_SECTIONS,
  },
];

interface AddSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSection: (template: SectionTemplate) => void;
  onLoadPreset?: (sections: SectionTemplate[]) => void;
}

export const AddSectionModal = ({ isOpen, onClose, onAddSection, onLoadPreset }: AddSectionModalProps) => {
  const handleSelectSection = (template: SectionTemplate) => {
    onAddSection(template);
    onClose();
  };

  const handleSelectPreset = (preset: MeetingPreset) => {
    if (onLoadPreset) {
      onLoadPreset(preset.sections);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Section</DialogTitle>
        </DialogHeader>
        
        <div className="max-h-[60vh] overflow-y-auto space-y-4">
          {/* Meeting Presets */}
          {onLoadPreset && (
            <>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Use as Base</h3>
                <div className="grid grid-cols-3 gap-3">
                  {MEETING_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset)}
                      className="flex flex-col items-start gap-2 p-4 rounded-lg border border-border bg-card hover:bg-accent transition-colors text-left"
                    >
                      <div className="flex items-center gap-2 w-full">
                        {preset.icon}
                        <span className="font-medium text-sm text-foreground">
                          {preset.title}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {preset.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Individual Sections */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Add Individual Section</h3>
            <div className="grid grid-cols-2 gap-3">
              {SECTION_LIBRARY.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelectSection(template)}
                  className="flex flex-col items-start gap-2 p-4 rounded-lg border border-border bg-card hover:bg-accent transition-colors text-left"
                >
                  <div className="flex items-center gap-2 w-full">
                    <Plus className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm text-foreground">
                      {template.title}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {template.description}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    Default: {template.defaultDuration} min
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
