import { supabase } from '@/integrations/supabase/client';
import { Users, Target, BarChart3, UserPlus, Video, GitBranch, Lightbulb } from 'lucide-react';
import { logger } from '@/utils/logger';

export interface AdminOnboardingItem {
  id: string;
  label: string;
  completed: boolean;
  description: string;
  icon: any;
}

export interface AdminOnboardingStatus {
  items: AdminOnboardingItem[];
  completedCount: number;
  totalCount: number;
  percentage: number;
}

/**
 * Check onboarding completion for a company using real-time queries
 * This uses the SAME logic as the user-facing OnboardingContext for consistency
 * Only used in Super Admin views (/company-management modal)
 */
export const checkAdminCompanyOnboarding = async (companyId: string): Promise<AdminOnboardingStatus> => {
  try {
    logger.log('🔍 Admin onboarding check for company:', companyId);

    // Call the SECURITY DEFINER function to bypass RLS and get accurate data
    const { data, error } = await supabase
      .rpc('get_company_onboarding_status', { p_company_id: companyId });

    if (error) {
      logger.error('❌ Error calling get_company_onboarding_status:', error);
      throw error;
    }

    if (!data) {
      throw new Error('No data returned from get_company_onboarding_status');
    }

    // Extract the results from the function
    const hasTeams = data.hasTeams || false;
    const hasGoals = data.hasGoals || false;
    const hasMetrics = data.hasMetrics || false;
    const userCount = data.userCount || 0;
    const hasMeetings = data.hasMeetings || false;
    const hasOrgChart = data.hasOrgChart || false;
    const hasStrategy = data.hasStrategy || false;

    logger.log('🔍 Admin onboarding results:', {
      companyId,
      hasTeams,
      hasGoals,
      hasMetrics,
      userCount,
      hasMeetings,
      hasOrgChart,
      hasStrategy
    });

    // Build items array matching OnboardingContext logic
    const items: AdminOnboardingItem[] = [
      {
        id: 'create-team',
        label: 'Create a Team',
        description: 'At least 1 team created',
        icon: Users,
        completed: hasTeams
      },
      {
        id: 'create-goal',
        label: 'Create a Goal',
        description: 'Set your first objective',
        icon: Target,
        completed: hasGoals
      },
      {
        id: 'create-metric',
        label: 'Create a Metric',
        description: 'Define measurable KPIs',
        icon: BarChart3,
        completed: hasMetrics
      },
      {
        id: 'invite-team',
        label: 'Invite your Team',
        description: 'Add team members',
        icon: UserPlus,
        completed: userCount > 1
      },
      {
        id: 'run-meeting',
        label: 'Run a Meeting',
        description: 'Conduct team meetings',
        icon: Video,
        completed: hasMeetings
      },
      {
        id: 'org-chart',
        label: 'Complete the Org Chart',
        description: 'Structure your organization',
        icon: GitBranch,
        completed: hasOrgChart
      },
      {
        id: 'strategy',
        label: 'Design your Strategy',
        description: 'Plan your roadmap',
        icon: Lightbulb,
        completed: hasStrategy
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
  } catch (error) {
    logger.error('❌ Error checking admin company onboarding:', error);
    
    // Return empty state on error
    return {
      items: [],
      completedCount: 0,
      totalCount: 7,
      percentage: 0
    };
  }
};
