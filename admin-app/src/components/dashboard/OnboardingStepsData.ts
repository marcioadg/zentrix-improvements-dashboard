import { 
  Users, 
  Target, 
  BarChart3, 
  UserPlus, 
  Video, 
  GitBranch, 
  Lightbulb 
} from 'lucide-react';
import { OnboardingStep } from '@/contexts/OnboardingContext';

export const onboardingStepsData: OnboardingStep[] = [
  {
    id: 'create-team',
    title: 'Create a Team',
    description: 'Go to People > Team',
    icon: Users,
    completed: false,
    inProgress: false
  },
  {
    id: 'create-goal',
    title: 'Create a Goal',
    description: 'Set your first objective',
    icon: Target,
    completed: false,
    inProgress: false
  },
  {
    id: 'create-metric',
    title: 'Create a Metric',
    description: 'Define measurable KPIs',
    icon: BarChart3,
    completed: false,
    inProgress: false
  },
  {
    id: 'invite-team',
    title: 'Invite your Team',
    description: 'Add team members',
    icon: UserPlus,
    completed: false,
    inProgress: false
  },
  {
    id: 'run-meeting',
    title: 'Run a Meeting',
    description: 'Conduct team meetings',
    icon: Video,
    completed: false,
    inProgress: false
  },
  {
    id: 'org-chart',
    title: 'Complete the Org Chart',
    description: 'Structure your organization',
    icon: GitBranch,
    completed: false,
    inProgress: false
  },
  {
    id: 'strategy',
    title: 'Design your Strategy',
    description: 'Plan your roadmap',
    icon: Lightbulb,
    completed: false,
    inProgress: false
  }
];