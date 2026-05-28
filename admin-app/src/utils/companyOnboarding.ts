import { CompanyWithStats } from '@/hooks/useCompanyManagement';
import { Users, Target, BarChart3, UserPlus, Video, GitBranch, Lightbulb } from 'lucide-react';

export interface OnboardingItem {
  id: string;
  label: string;
  completed: boolean;
  description: string;
  icon: any;
}

export interface OnboardingStatus {
  items: OnboardingItem[];
  completedCount: number;
  totalCount: number;
  percentage: number;
}

export const calculateCompanyOnboarding = (company: CompanyWithStats): OnboardingStatus => {
  const items: OnboardingItem[] = [
    {
      id: 'create-team',
      label: 'Create a Team',
      description: 'At least 1 team created',
      icon: Users,
      completed: company.team_count > 0
    },
    {
      id: 'create-goal',
      label: 'Create a Goal',
      description: 'Set your first objective',
      icon: Target,
      completed: (company.goals_count || 0) > 0
    },
    {
      id: 'create-metric',
      label: 'Create a Metric',
      description: 'Define measurable KPIs',
      icon: BarChart3,
      completed: company.metrics_count > 0
    },
    {
      id: 'invite-team',
      label: 'Invite your Team',
      description: 'Add team members',
      icon: UserPlus,
      completed: company.user_count > 1
    },
    {
      id: 'run-meeting',
      label: 'Run a Meeting',
      description: 'Conduct team meetings',
      icon: Video,
      completed: (company.meetings_count || 0) > 0
    },
    {
      id: 'org-chart',
      label: 'Complete the Org Chart',
      description: 'Structure your organization',
      icon: GitBranch,
      completed: (company.org_roles_count || 0) > 0
    },
    {
      id: 'strategy',
      label: 'Design your Strategy',
      description: 'Plan your roadmap',
      icon: Lightbulb,
      completed: (company.strategy_count || 0) > 0
    }
  ];

  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;
  const percentage = Math.round((completedCount / totalCount) * 100);

  return {
    items,
    completedCount,
    totalCount,
    percentage
  };
};
