// Section type mapping for custom meetings
export const SECTION_TYPE_MAP: Record<string, string> = {
  'Good News': 'good_news',
  'Metrics': 'metrics',
  'Goals': 'goals',
  'Headlines': 'headlines',
  'Tasks': 'tasks',
  'Issues': 'issues',
  'Wrap Up': 'wrap_up',
  'Check-In': 'check_in',
  'Review Prior Quarter': 'review_prior_quarter',
  'Review Strategy/Execution': 'review_strategy',
  'Tools Review': 'tools_review',
  'Next Steps': 'next_steps',
};

// Section library for custom meeting builder
export interface SectionTemplate {
  id: string;
  title: string;
  defaultDuration: number;
  type: string;
  description?: string;
  required?: boolean;
}

// Utility to ensure Wrap Up section is always present, marked as required, and at the end
export const ensureWrapUpSection = (sections: any[]): any[] => {
  // Find and remove wrap up section if it exists
  const wrapUpSection = sections.find(s => s.type === 'wrap_up');
  const otherSections = sections.filter(s => s.type !== 'wrap_up');
  
  // Create or update wrap up section
  const finalWrapUp = wrapUpSection 
    ? { ...wrapUpSection, required: true }
    : {
        id: `wrap-up-${Date.now()}`,
        title: 'Wrap Up',
        duration: 8,
        completed: false,
        type: 'wrap_up',
        required: true
      };
  
  // Return sections with wrap up always at the end
  return [...otherSections, finalWrapUp];
};

export const SECTION_LIBRARY: SectionTemplate[] = [
  { id: 'good_news', title: 'Good News', defaultDuration: 5, type: 'good_news', description: 'Share positive updates' },
  { id: 'check_in', title: 'Check-In', defaultDuration: 15, type: 'check_in', description: 'Team check-in session' },
  { id: 'metrics', title: 'Metrics', defaultDuration: 5, type: 'metrics', description: 'Review key metrics' },
  { id: 'goals', title: 'Goals', defaultDuration: 5, type: 'goals', description: 'Discuss goals and progress' },
  { id: 'headlines', title: 'Headlines', defaultDuration: 5, type: 'headlines', description: 'Quick updates from teams' },
  { id: 'tasks', title: 'Tasks', defaultDuration: 5, type: 'tasks', description: 'Review action items' },
  { id: 'issues', title: 'Issues', defaultDuration: 60, type: 'issues', description: 'Solve problems together' },
  { id: 'review_prior_quarter', title: 'Review Prior Quarter', defaultDuration: 30, type: 'review_prior_quarter', description: 'Quarterly retrospective' },
  { id: 'review_strategy', title: 'Review Strategy/Execution', defaultDuration: 60, type: 'review_strategy', description: 'Strategic planning' },
  { id: 'tools_review', title: 'Tools Review', defaultDuration: 60, type: 'tools_review', description: 'Review systems and tools' },
  { id: 'next_steps', title: 'Next Steps', defaultDuration: 7, type: 'next_steps', description: 'Define action items' },
  { id: 'custom_section', title: 'Custom Section', defaultDuration: 10, type: 'custom_section', description: 'Create your own section' },
];
