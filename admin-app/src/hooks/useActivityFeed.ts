import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { logger } from '@/utils/logger';

interface Activity {
  id: string;
  action: string;
  target: string;
  type: string;
  timestamp: string;
  user?: {
    name: string;
    avatar_url?: string;
  };
}

export const useActivityFeed = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentCompany } = useMultiCompanyAccess();

  // Track mount state to prevent state updates after unmount
  const isMountedRef = useRef(true);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchActivities = async () => {
    if (!currentCompany?.id) return;

    try {
      setLoading(true);
      logger.log('🔍 useActivityFeed: Fetching comprehensive activities for company:', currentCompany?.name);

      // Run all queries in parallel for faster dashboard load
      // Use Promise.allSettled so one failed query doesn't kill the entire feed
      const results = await Promise.allSettled([
        // Fetch recent fast tasks
        supabase
          .from('fast_tasks')
          .select(`
            id, title, status, updated_at, created_at, user_id,
            teams!inner(company_id),
            profiles!user_id(full_name, avatar_url)
          `)
          .eq('teams.company_id', currentCompany?.id)
          .eq('is_deleted', false)
          .order('updated_at', { ascending: false })
          .limit(10),

        // Fetch recent metrics
        supabase
          .from('weekly_metrics')
          .select(`
            id, metric_name, updated_at, created_at, owner_id,
            teams!inner(company_id),
            profiles!owner_id(full_name, avatar_url)
          `)
          .eq('teams.company_id', currentCompany?.id)
          .order('updated_at', { ascending: false })
          .limit(5),

        // Fetch recent issues
        supabase
          .from('issues')
          .select(`
            id, title, status, created_at, updated_at, created_by,
            teams!inner(company_id),
            profiles!created_by(full_name, avatar_url)
          `)
          .eq('teams.company_id', currentCompany?.id)
          .order('created_at', { ascending: false })
          .limit(8),

        // Fetch recent team goals
        supabase
          .from('team_goals')
          .select(`
            id, title, status, created_at, updated_at, created_by,
            teams!inner(company_id),
            profiles!created_by(full_name, avatar_url)
          `)
          .eq('teams.company_id', currentCompany?.id)
          .order('created_at', { ascending: false })
          .limit(5),

        // Fetch recent team member additions
        supabase
          .from('team_members')
          .select(`
            id, joined_at, user_id, role,
            teams!inner(company_id, name),
            profiles!user_id(full_name, avatar_url)
          `)
          .eq('teams.company_id', currentCompany?.id)
          .order('joined_at', { ascending: false })
          .limit(8),

        // Fetch recent company member additions
        supabase
          .from('company_members')
          .select(`
            id, joined_at, accepted_at, user_id,
            profiles!user_id(full_name, avatar_url)
          `)
          .eq('company_id', currentCompany?.id)
          .neq('status', 'pending')
          .order('joined_at', { ascending: false })
          .limit(5),

        // Fetch recent invitations sent
        supabase
          .from('company_members')
          .select(`
            id, invited_at, email, invited_by, permission_level,
            profiles!invited_by(full_name, avatar_url)
          `)
          .eq('company_id', currentCompany?.id)
          .eq('status', 'pending')
          .order('invited_at', { ascending: false })
          .limit(5),

        // Fetch recent strategy responses
        supabase
          .from('deep_strategy_responses')
          .select(`
            id, created_at, updated_at, strategy_mode, user_id,
            profiles!user_id(full_name, avatar_url)
          `)
          .eq('company_id', currentCompany?.id)
          .order('updated_at', { ascending: false })
          .limit(3),

        // Fetch recent playbooks
        supabase
          .from('playbooks')
          .select(`
            id, title, created_at, updated_at, created_by,
            profiles!created_by(full_name, avatar_url)
          `)
          .eq('company_id', currentCompany?.id)
          .order('updated_at', { ascending: false })
          .limit(5),

        // Fetch recent team creations
        supabase
          .from('teams')
          .select(`
            id, name, created_at, created_by,
            profiles!created_by(full_name, avatar_url)
          `)
          .eq('company_id', currentCompany?.id)
          .neq('name', 'General')
          .order('created_at', { ascending: false })
          .limit(5),

        // Fetch recent org chart changes (role assignments)
        supabase
          .from('role_assignments')
          .select(`
            id, created_at, updated_at, user_id, updated_by,
            org_roles!inner(title, company_id),
            profiles!user_id(full_name, avatar_url),
            assignedByProfile:updated_by(full_name, avatar_url)
          `)
          .eq('org_roles.company_id', currentCompany?.id)
          .not('updated_at', 'is', null)
          .order('updated_at', { ascending: false })
          .limit(5),

        // Fetch recent strategic plans
        supabase
          .from('strategic_plans')
          .select(`
            id, title, created_at, updated_at, created_by,
            profiles!created_by(full_name, avatar_url)
          `)
          .eq('company_id', currentCompany?.id)
          .order('updated_at', { ascending: false })
          .limit(3),

        // Fetch recent wiki pages
        supabase
          .from('wiki_pages')
          .select(`
            id, title, created_at, updated_at, created_by,
            profiles!created_by(full_name, avatar_url)
          `)
          .eq('company_id', currentCompany?.id)
          .order('updated_at', { ascending: false })
          .limit(3),
      ]);

      // Safely extract data from settled results — failed queries return null instead of crashing the feed
      const extractData = (index: number) => {
        const result = results[index];
        if (result.status === 'fulfilled') return result.value.data;
        logger.warn('⚠️ useActivityFeed: Query failed (index ' + index + '):', result.reason);
        return null;
      };

      const recentTasks = extractData(0);
      const recentMetrics = extractData(1);
      const recentIssues = extractData(2);
      const recentGoals = extractData(3);
      const recentTeamMembers = extractData(4);
      const recentCompanyMembers = extractData(5);
      const recentInvitations = extractData(6);
      const recentStrategy = extractData(7);
      const recentPlaybooks = extractData(8);
      const recentTeams = extractData(9);
      const recentRoleAssignments = extractData(10);
      const recentStrategicPlans = extractData(11);
      const recentWikiPages = extractData(12);

      const activities: Activity[] = [];

      // Add task activities (ORIGINAL)
      if (recentTasks) {
        recentTasks.forEach(task => {
          const isNewTask = new Date(task.created_at).getTime() > (Date.now() - 24 * 60 * 60 * 1000);
          activities.push({
            id: `task-${task.id}`,
            action: isNewTask ? 'created task' : (task.status === 'done' ? 'completed task' : 'updated task'),
            target: task.title,
            type: 'task',
            timestamp: task.updated_at,
            user: (task.profiles as any)?.full_name ? {
              name: (task.profiles as any).full_name || 'Unknown User',
              avatar_url: (task.profiles as any).avatar_url
            } : undefined
          });
        });
      }

      // Add metric activities (ORIGINAL)
      if (recentMetrics) {
        recentMetrics.forEach(metric => {
          const isNewMetric = new Date(metric.created_at).getTime() > (Date.now() - 24 * 60 * 60 * 1000);
          activities.push({
            id: `metric-${metric.id}`,
            action: isNewMetric ? 'created metric' : 'updated metric',
            target: metric.metric_name,
            type: 'metric',
            timestamp: metric.updated_at,
            user: (metric.profiles as any)?.full_name ? {
              name: (metric.profiles as any).full_name || 'Unknown User',
              avatar_url: (metric.profiles as any).avatar_url
            } : undefined
          });
        });
      }

      // Add issue activities (ORIGINAL)
      if (recentIssues) {
        recentIssues.forEach(issue => {
          const isNewIssue = new Date(issue.created_at).getTime() > (Date.now() - 24 * 60 * 60 * 1000);
          activities.push({
            id: `issue-${issue.id}`,
            action: isNewIssue ? 'created issue' : 'updated issue',
            target: issue.title,
            type: 'issue',
            timestamp: issue.created_at,
            user: (issue.profiles as any)?.full_name ? {
              name: (issue.profiles as any).full_name || 'Unknown User',
              avatar_url: (issue.profiles as any).avatar_url
            } : undefined
          });
        });
      }

      // Add goal activities (ORIGINAL)
      if (recentGoals) {
        recentGoals.forEach(goal => {
          const isNewGoal = new Date(goal.created_at).getTime() > (Date.now() - 24 * 60 * 60 * 1000);
          activities.push({
            id: `goal-${goal.id}`,
            action: isNewGoal ? 'created goal' : 'updated goal',
            target: goal.title,
            type: 'goal',
            timestamp: goal.updated_at,
            user: (goal.profiles as any)?.full_name ? {
              name: (goal.profiles as any).full_name || 'Unknown User',
              avatar_url: (goal.profiles as any).avatar_url
            } : undefined
          });
        });
      }

      // Add team member activities (ORIGINAL)
      if (recentTeamMembers) {
        recentTeamMembers.forEach(member => {
          const isRecent = new Date(member.joined_at).getTime() > (Date.now() - 7 * 24 * 60 * 60 * 1000);
          if (isRecent) {
            activities.push({
              id: `team-member-${member.id}`,
              action: 'joined team',
              target: (member.teams as any)?.name || 'team',
              type: 'team',
              timestamp: member.joined_at,
              user: (member.profiles as any)?.full_name ? {
                name: (member.profiles as any).full_name || 'Unknown User',
                avatar_url: (member.profiles as any).avatar_url
              } : undefined
            });
          }
        });
      }

      // Add company member activities (ORIGINAL)
      if (recentCompanyMembers) {
        recentCompanyMembers.forEach(member => {
          const isRecent = new Date(member.joined_at).getTime() > (Date.now() - 7 * 24 * 60 * 60 * 1000);
          if (isRecent) {
            activities.push({
              id: `company-member-${member.id}`,
              action: 'joined company',
              target: currentCompany?.name,
              type: 'company',
              timestamp: member.accepted_at || member.joined_at,
              user: (member.profiles as any)?.full_name ? {
                name: (member.profiles as any).full_name || 'Unknown User',
                avatar_url: (member.profiles as any).avatar_url
              } : undefined
            });
          }
        });
      }

      // Add invitation activities (ORIGINAL)
      if (recentInvitations) {
        recentInvitations.forEach(invitation => {
          const isRecent = new Date(invitation.invited_at).getTime() > (Date.now() - 7 * 24 * 60 * 60 * 1000);
          if (isRecent) {
            activities.push({
              id: `invitation-${invitation.id}`,
              action: 'sent invitation to',
              target: invitation.email,
              type: 'invitation',
              timestamp: invitation.invited_at,
              user: (invitation.profiles as any)?.full_name ? {
                name: (invitation.profiles as any).full_name || 'Unknown User',
                avatar_url: (invitation.profiles as any).avatar_url
              } : undefined
            });
          }
        });
      }

      // Add strategy activities (ORIGINAL)
      if (recentStrategy) {
        recentStrategy.forEach(strategy => {
          const isNew = new Date(strategy.created_at).getTime() > (Date.now() - 24 * 60 * 60 * 1000);
          activities.push({
            id: `strategy-response-${strategy.id}`,
            action: isNew ? 'created strategy response' : 'updated strategy',
            target: strategy.strategy_mode || 'strategic planning',
            type: 'strategy',
            timestamp: strategy.updated_at,
            user: (strategy.profiles as any)?.full_name ? {
              name: (strategy.profiles as any).full_name || 'Unknown User',
              avatar_url: (strategy.profiles as any).avatar_url
            } : undefined
          });
        });
      }

      // Add process/playbook activities (ORIGINAL)
      if (recentPlaybooks) {
        recentPlaybooks.forEach(playbook => {
          const isNew = new Date(playbook.created_at).getTime() > (Date.now() - 7 * 24 * 60 * 60 * 1000);
          activities.push({
            id: `playbook-${playbook.id}`,
            action: isNew ? 'created process' : 'updated process',
            target: playbook.title,
            type: 'process',
            timestamp: playbook.updated_at,
            user: (playbook.profiles as any)?.full_name ? {
              name: (playbook.profiles as any).full_name || 'Unknown User',
              avatar_url: (playbook.profiles as any).avatar_url
            } : undefined
          });
        });
      }

      // Add team creation activities (ORIGINAL)
      if (recentTeams) {
        recentTeams.forEach(team => {
          const isRecent = new Date(team.created_at).getTime() > (Date.now() - 7 * 24 * 60 * 60 * 1000);
          if (isRecent) {
            activities.push({
              id: `team-creation-${team.id}`,
              action: 'created team',
              target: team.name,
              type: 'team-creation',
              timestamp: team.created_at,
              user: (team.profiles as any)?.full_name ? {
                name: (team.profiles as any).full_name || 'Unknown User',
                avatar_url: (team.profiles as any).avatar_url
              } : undefined
            });
          }
        });
      }

      // NEW ACTIVITIES - Add the missing functionality

      // Add org chart activities (NEW - FIXED)
      if (recentRoleAssignments) {
        recentRoleAssignments.forEach(assignment => {
          const isRecent = new Date(assignment.updated_at).getTime() > (Date.now() - 7 * 24 * 60 * 60 * 1000);
          if (isRecent) {
            activities.push({
              id: `org-chart-${assignment.id}`,
              action: 'updated org chart for',
              target: (assignment.profiles as any)?.full_name || 'team member',
              type: 'org-chart',
              timestamp: assignment.updated_at,
              user: (assignment.assignedByProfile as any)?.full_name ? {
                name: (assignment.assignedByProfile as any).full_name || 'Admin',
                avatar_url: (assignment.assignedByProfile as any).avatar_url
              } : undefined
            });
          }
        });
      }

      // Add strategic plan activities (NEW)
      if (recentStrategicPlans) {
        recentStrategicPlans.forEach(plan => {
          const isNew = new Date(plan.created_at).getTime() > (Date.now() - 7 * 24 * 60 * 60 * 1000);
          activities.push({
            id: `strategic-plan-${plan.id}`,
            action: isNew ? 'created strategic plan' : 'updated strategic plan',
            target: plan.title || 'Strategic Plan',
            type: 'strategic-plan',
            timestamp: plan.updated_at,
            user: (plan.profiles as any)?.full_name ? {
              name: (plan.profiles as any).full_name || 'Unknown User',
              avatar_url: (plan.profiles as any).avatar_url
            } : undefined
          });
        });
      }

      // Add wiki page activities (NEW)
      if (recentWikiPages) {
        recentWikiPages.forEach(wiki => {
          const isNew = new Date(wiki.created_at).getTime() > (Date.now() - 7 * 24 * 60 * 60 * 1000);
          activities.push({
            id: `wiki-${wiki.id}`,
            action: isNew ? 'created wiki page' : 'updated wiki page',
            target: wiki.title,
            type: 'documentation',
            timestamp: wiki.updated_at,
            user: (wiki.profiles as any)?.full_name ? {
              name: (wiki.profiles as any).full_name || 'Unknown User',
              avatar_url: (wiki.profiles as any).avatar_url
            } : undefined
          });
        });
      }

      // Sort by timestamp
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      logger.log('🔍 useActivityFeed: Found activities:', activities.length);
      if (isMountedRef.current) {
        setActivities(activities.slice(0, 25));
      }

    } catch (error) {
      logger.error('❌ useActivityFeed: Error fetching activities:', error);
      if (isMountedRef.current) {
        setActivities([]);
        setError('Failed to load activity');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  // Debounced refetch to prevent request flooding from rapid real-time events
  const debouncedFetch = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      fetchActivities();
    }, 1000);
  }, [currentCompany?.id]);

  // Real-time subscriptions for instant updates
  useEffect(() => {
    if (!currentCompany?.id) return;

    const channel = supabase.channel('activity-feed-updates')
      // Listen for team changes
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'teams',
        filter: `company_id=eq.${currentCompany?.id}`
      }, () => {
        logger.log('🔄 Team activity detected, refreshing feed...');
        debouncedFetch();
      })
      // Listen for unified fast_tasks changes (single subscription for all tasks)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'fast_tasks'
      }, () => {
        logger.log('🔄 Task activity detected, refreshing feed...');
        debouncedFetch();
      })
      // Listen for role assignment changes
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'role_assignments'
      }, () => {
        logger.log('🔄 Org chart activity detected, refreshing feed...');
        debouncedFetch();
      })
      // Listen for company member changes
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'company_members',
        filter: `company_id=eq.${currentCompany?.id}`
      }, () => {
        logger.log('🔄 Company member activity detected, refreshing feed...');
        debouncedFetch();
      })
      // Listen for playbook changes
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'playbooks',
        filter: `company_id=eq.${currentCompany?.id}`
      }, () => {
        logger.log('🔄 Process doc activity detected, refreshing feed...');
        debouncedFetch();
      })
      // Listen for strategic plan changes
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'strategic_plans',
        filter: `company_id=eq.${currentCompany?.id}`
      }, () => {
        logger.log('🔄 Strategy activity detected, refreshing feed...');
        debouncedFetch();
      })
      // Listen for wiki page changes
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'wiki_pages',
        filter: `company_id=eq.${currentCompany?.id}`
      }, () => {
        logger.log('🔄 Wiki activity detected, refreshing feed...');
        debouncedFetch();
      })
      .subscribe();

    return () => {
      isMountedRef.current = false;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [currentCompany?.id, debouncedFetch]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchActivities();
    return () => {
      isMountedRef.current = false;
    };
  }, [currentCompany?.id]);

  return { activities, loading, error, refetch: fetchActivities };
};