import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react';
// NOTE: This provider is above <Router> in the tree, so useNavigate cannot be used.
// Use window.location.href for navigation instead.
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { broadcastParticipantsChanged } from '@/hooks/useMeetingParticipants';
import { logger } from '@/utils/logger';
import { logRefreshTrigger } from '@/utils/refreshTelemetry';
import { trackFBSQLOnce } from '@/utils/facebookTracking';


export type MeetingRole = 'scriber' | 'participant';

export interface TimerState {
  currentSection: number;
  sectionStartTime: number;
  meetingStartTime: number;
  sectionDurations: number[];
  sectionAccumulatedTimes: Record<number, number>;
  isPaused: boolean;
}

export interface TimerCalculations {
  overallDurationMs: number;
  sectionDurationMs: number;
  sectionAccumulatedMs: number;
  activeDurationMs: number;
}

interface NewMeetingTimerContextType {
  // Timer state
  isRunning: boolean;
  meetingId: string | null;
  currentRole: MeetingRole | null;
  timerState: TimerState;
  calculations: TimerCalculations;
  recentlyEndedMeeting: boolean;
  
  // Timer controls
  startMeeting: (teamId: string, role: MeetingRole, meetingType?: string) => Promise<void>;
  joinExistingMeeting: (meetingId: string, role: MeetingRole) => Promise<void>;
  endMeeting: () => Promise<void>;
  leaveMeeting: () => Promise<void>;
  pauseMeeting: () => Promise<void>;
  resumeMeeting: () => Promise<void>;
  changeSection: (sectionIndex: number) => Promise<void>;
  
  // Enhanced role management
  canControlTimer: boolean;
  pauseTimer: (reason?: string) => Promise<void>;
  resumeTimer: () => Promise<void>;
  scriberId: string | null;
  currentUserId: string | null;
  isOvertime: (targetMs: number) => boolean;
  takeOverAsScriber: () => Promise<void>;
  updateScriiberHeartbeat: () => Promise<void>;
  
  // Section broadcast for real-time sync
  setSectionBroadcast: (fn: (sectionIndex: number, sectionStartTime: number) => void) => void;
  applyRemoteSectionChange: (sectionIndex: number, sectionStartTime: number) => void;
  
  // Scriber broadcast for real-time sync
  setScriberBroadcast: (fn: (scriberId: string | null) => void) => void;
  applyRemoteScriberChange: (scriberId: string | null) => void;
  
  // Meeting started broadcast for real-time sync across all users
  setMeetingStartedBroadcast: (fn: (teamId: string, meetingType: string, meetingData: any) => void) => void;
  
  // Auto-create issues for off-track items (called when navigating to Issues section)
  triggerAutoCreateIssues: (teamId: string) => Promise<void>;
  
  // Utilities
  formatDuration: (ms: number) => string;
}

const initialTimerState: TimerState = {
  currentSection: 0,
  sectionStartTime: 0,
  meetingStartTime: 0,
  sectionDurations: [],
  sectionAccumulatedTimes: {},
  isPaused: false,
};

const defaultContextValue: NewMeetingTimerContextType = {
  isRunning: false,
  meetingId: null,
  currentRole: null,
  timerState: initialTimerState,
  calculations: {
    overallDurationMs: 0,
    sectionDurationMs: 0,
    sectionAccumulatedMs: 0,
    activeDurationMs: 0,
  },
  recentlyEndedMeeting: false,
  triggerAutoCreateIssues: async () => {},
  canControlTimer: false,
  pauseTimer: async () => {},
  resumeTimer: async () => {},
  scriberId: null,
  currentUserId: null,
  isOvertime: () => false,
  takeOverAsScriber: async () => {},
  updateScriiberHeartbeat: async () => {},
  startMeeting: async () => {},
  joinExistingMeeting: async () => {},
  endMeeting: async () => {},
  leaveMeeting: async () => {},
  pauseMeeting: async () => {},
  resumeMeeting: async () => {},
  changeSection: async () => {},
  setSectionBroadcast: () => {},
  applyRemoteSectionChange: () => {},
  setScriberBroadcast: () => {},
  applyRemoteScriberChange: () => {},
  setMeetingStartedBroadcast: () => {},
  formatDuration: () => '00:00',
};

const NewMeetingTimerContext = createContext<NewMeetingTimerContextType>(defaultContextValue);

export { NewMeetingTimerContext };
export const useNewMeetingTimer = () => useContext(NewMeetingTimerContext);

export const NewMeetingTimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // No useNavigate - this provider is above <Router>

  const [isRunning, setIsRunning] = useState(false);
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<MeetingRole | null>(null);
  const [timerState, setTimerState] = useState<TimerState>(initialTimerState);
  const [recentlyEndedMeeting, setRecentlyEndedMeeting] = useState(false);
  const [scriberId, setScriberId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [realTimeDurations, setRealTimeDurations] = useState<TimerCalculations>({
    overallDurationMs: 0,
    sectionDurationMs: 0,
    sectionAccumulatedMs: 0,
    activeDurationMs: 0,
  });
  
  // State to track the section before pause (for resuming back to it)
  const [sectionBeforePause, setSectionBeforePause] = useState<number | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const realtimeSubscription = useRef<any>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  // Mirror of timerState for safe synchronous reads inside async callbacks
  // (used by changeSection to capture rollback values without adding state to deps)
  const timerStateRef = useRef<TimerState>(initialTimerState);
  useEffect(() => {
    timerStateRef.current = timerState;
  }, [timerState]);

  const { toast } = useToast();

  // Get current user ID
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  // Auto-creation function without hooks (to avoid dependency issues)
  const createIssuesForOverdueItems = useCallback(async (teamId: string) => {
    logger.log('🚀 Auto-creating issues for overdue items for team:', teamId);
    
    try {
      // Get company settings via team
      const { data: teamData } = await supabase
        .from('teams')
        .select('company_id')
        .eq('id', teamId)
        .single();

      if (!teamData?.company_id) {
        logger.log('⏭️ No company found for team');
        return 0;
      }

      const { data: companyData } = await supabase
        .from('companies')
        .select('auto_create_overdue_issues')
        .eq('id', teamData.company_id)
        .single();

      const isAutoCreateEnabled = companyData?.auto_create_overdue_issues || false;
      
      if (!isAutoCreateEnabled) {
        logger.log('⏭️ Auto-create disabled in company settings');
        return 0;
      }

      let createdCount = 0;

      // Check for existing OPEN issues only - resolved issues are ignored so new ones
      // can be created if the item becomes off-track again
      const { data: existingIssues } = await supabase
        .from('issues')
        .select('title')
        .eq('team_id', teamId)
        .eq('status', 'open')
        .or('archived.is.null,archived.eq.false');

      const existingTitles = new Set(existingIssues?.map(i => i.title.toLowerCase()) || []);

      // Fetch active team members once — reused by all three scenarios below.
      // If the query fails we still enforce the check (empty set = skip all items)
      // to prevent creating issues for members who are not on this team.
      const { data: teamMembersData, error: teamMembersError } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', teamId);
      const activeTeamMemberIds = new Set(teamMembersData?.map(m => m.user_id) || []);
      const memberCheckEnabled = !teamMembersError;

      // 1. Create issues for overdue team tasks
      const { data: tasks } = await supabase
        .from('fast_tasks')
        .select('*')
        .eq('team_id', teamId)
        .eq('task_type', 'team')
        .neq('status', 'done')
        .eq('is_deleted', false)
        .eq('is_archived', false);

      const overdueTasks = tasks?.filter(task => 
        task.due_date && new Date(task.due_date) < new Date()
      ) || [];

      logger.log(`📋 Found ${overdueTasks.length} overdue team tasks`);

      for (const task of overdueTasks) {
        const title = task.title;
        
        if (existingTitles.has(title.toLowerCase())) {
          logger.log(`⏭️ Issue already exists for task: ${task.title}`);
          continue;
        }

        // Resolve owner: first assignee, then task creator
        const resolvedOwnerId = (Array.isArray(task.assigned_to) && task.assigned_to.length > 0
          ? task.assigned_to[0]
          : task.assigned_to) || task.user_id;

        // Skip if the owner is no longer an active team member
        if (memberCheckEnabled && !activeTeamMemberIds.has(resolvedOwnerId)) {
          logger.warn(`⚠️ Skipping auto-issue for task "${task.title}" — owner ${resolvedOwnerId} is no longer a team member`);
          continue;
        }

        const description = `Task "${task.title}" is overdue (due: ${task.due_date}).

${task.description ? `Description: ${task.description}` : ''}

Please review and complete this overdue task.`;

        try {
          const { data: user } = await supabase.auth.getUser();
          if (!user.user) throw new Error('User not authenticated');

          const { error } = await supabase
            .from('issues')
            .insert({
              title,
              description,
              team_id: teamId,
              owner_id: resolvedOwnerId,
              created_by: user.user.id,
              issue_type: 'short_term',
              status: 'open',
              archived: false
            });

          if (error) throw error;

          createdCount++;
          logger.log(`✅ Created issue for overdue task: ${task.title}`);
        } catch (error) {
          logger.error(`❌ Failed to create issue for task ${task.title}:`, error);
        }
      }

      // 2. Create issues for off-track team metrics
      try {
        // Fetch active (non-archived, non-deleted) metric definitions first.
        // This mirrors the filter used by metricDataService for the live scorecard.
        // If this query fails we fall back gracefully (activeMetricKeys = null → no filter).
        let activeMetricKeys: Set<string> | null = null;
        try {
          const { data: activeMetricDefs } = await supabase
            .from('metrics')
            .select('metric_name, owner_id')
            .eq('team_id', teamId)
            .is('deleted_at', null)
            .is('archived_at', null);
          if (activeMetricDefs) {
            activeMetricKeys = new Set(activeMetricDefs.map(m => `${m.metric_name}-${m.owner_id}`));
            logger.log(`📊 Found ${activeMetricKeys.size} active (non-archived) metric definitions`);
          }
        } catch (metricDefError) {
          logger.warn('⚠️ Could not fetch active metric definitions — skipping archived_at filter', metricDefError);
        }

        // Only evaluate metrics from the last 2 weeks to avoid stale data
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        
        const { data: metrics } = await supabase
          .from('weekly_metrics')
          .select(`
            id,
            metric_name,
            owner_id,
            target_value,
            target_logic,
            unit,
            metric_value,
            week_start_date,
            custom_target_value,
            target_note,
            profiles!weekly_metrics_owner_id_fkey(full_name)
          `)
          .eq('team_id', teamId)
          .gte('week_start_date', twoWeeksAgo.toISOString().split('T')[0])
          .is('deleted_at', null)
          .order('week_start_date', { ascending: false });

        logger.log(`📊 Found ${metrics?.length || 0} metric entries to evaluate`);

        if (metrics && metrics.length > 0) {
          // Group metrics by name and owner to get latest values WITH DATA
          const metricsByKey = new Map();
          metrics.forEach(metric => {
            // Skip metrics with no value - can't determine if off-track
            if (metric.metric_value === null || metric.metric_value === undefined) {
              return;
            }

            const key = `${metric.metric_name}-${metric.owner_id}`;

            // Skip weekly_metrics rows whose parent metric definition is archived or deleted
            if (activeMetricKeys !== null && !activeMetricKeys.has(key)) {
              return;
            }
            
            if (!metricsByKey.has(key) || 
                new Date(metric.week_start_date) > new Date(metricsByKey.get(key).week_start_date)) {
              metricsByKey.set(key, metric);
            }
          });

          const latestMetrics = Array.from(metricsByKey.values());
          logger.log(`📊 Evaluating ${latestMetrics.length} unique metrics for off-track status`);

          for (const metric of latestMetrics) {
            // Follow exact same logic as useMetricIssueCreation hook
            const value = metric.metric_value;
            if (value === null || value === undefined) {
              logger.log(`⏭️ Metric ${metric.metric_name} has no value - NOT off-track`);
              continue;
            }
            
            // Use custom target if available, otherwise fall back to global target
            const effectiveTarget = metric.custom_target_value ?? metric.target_value;
            if (effectiveTarget === null || effectiveTarget === undefined) {
              logger.log(`⏭️ Metric ${metric.metric_name} has no target - NOT off-track`);
              continue;
            }

            // Use the same logic as the useMetricIssueCreation hook (copied to avoid hook usage issues)
            const targetLogic = metric.target_logic || 'greater_than_or_equal';
            let isOffTrack = false;

            // Evaluate based on target logic (matching useMetricIssueCreation hook)
            switch (targetLogic) {
              case 'greater_than':
                isOffTrack = value <= effectiveTarget;
                break;
              case 'greater_than_or_equal':
                isOffTrack = value < effectiveTarget;
                break;
              case 'less_than':
                isOffTrack = value >= effectiveTarget;
                break;
              case 'less_than_or_equal':
                isOffTrack = value > effectiveTarget;
                break;
              case 'equal':
              case 'equal_to':
                isOffTrack = value !== effectiveTarget;
                break;
              default:
                // Default to "greater than or equal" logic
                isOffTrack = value < effectiveTarget;
            }

            logger.log(`📊 Metric ${metric.metric_name}: ${value} vs ${effectiveTarget} ${metric.custom_target_value !== null ? '(custom)' : '(global)'} (${metric.target_logic || 'greater_than_or_equal'}) - Off track: ${isOffTrack}`);

            if (isOffTrack) {
              // Skip if the metric owner is no longer an active team member
              if (memberCheckEnabled && !activeTeamMemberIds.has(metric.owner_id)) {
                logger.warn(`⚠️ Skipping auto-issue for metric "${metric.metric_name}" — owner ${metric.owner_id} is no longer a team member`);
                continue;
              }

              // Determine if metric is below or above target based on target_logic
              // For "greater_than" / "greater_than_or_equal" -> value too low = "Below Target"
              // For "less_than" / "less_than_or_equal" -> value too high = "Above Target"
              let direction: 'Below' | 'Above' = 'Below';
              switch (targetLogic) {
                case 'less_than':
                case 'less_than_or_equal':
                  direction = 'Above';
                  break;
                case 'equal':
                case 'equal_to':
                  direction = value < effectiveTarget ? 'Below' : 'Above';
                  break;
                default:
                  direction = 'Below';
              }
              
              const title = `Metric: ${metric.metric_name} - ${direction} Target`;
              
              if (existingTitles.has(title.toLowerCase())) {
                logger.log(`⏭️ Issue already exists for metric: ${metric.metric_name}`);
                continue;
              }

              const ownerName = metric.profiles?.full_name || 'Unknown';
              const formattedWeek = new Date(metric.week_start_date).toLocaleDateString();
              
              const description = `Metric "${metric.metric_name}" is underperforming:
- Current Value: ${metric.metric_value} ${metric.unit}
- Target: ${effectiveTarget} ${metric.unit}${metric.custom_target_value !== null ? ' (custom)' : ''}
- Target Logic: ${metric.target_logic || 'greater_than_or_equal'}
- Owner: ${ownerName}
- Week: ${formattedWeek}

Please review and take action to get this metric back on track.`;

              try {
                // Use the proper pattern from useSimpleIssues - create issue with proper validation and owner
                const { data: user } = await supabase.auth.getUser();
                if (!user.user) throw new Error('User not authenticated');

                const { error } = await supabase
                  .from('issues')
                  .insert({
                    title,
                    description,
                    team_id: teamId,
                    owner_id: metric.owner_id, // Use the metric's owner, not current user
                    created_by: user.user.id,
                    issue_type: 'short_term',
                    status: 'open',
                    archived: false
                  });

                if (error) throw error;
                
                createdCount++;
                logger.log(`✅ Created issue for off-track metric: ${metric.metric_name}`);
              } catch (error) {
                logger.error(`❌ Failed to create issue for metric ${metric.metric_name}:`, error);
              }
            }
          }
          
          // 2b. AUTO-RESOLVE: Mark metric issues as resolved if their metric is now ON-TRACK
          try {
            logger.log('🔄 Checking for auto-resolvable metric issues...');
            
            // Build set of ON-TRACK metric names (case-insensitive)
            const onTrackMetricNames = new Set<string>();
            
            for (const metric of latestMetrics) {
              const value = metric.metric_value;
              if (value === null || value === undefined) continue;
              
              const effectiveTarget = metric.custom_target_value ?? metric.target_value;
              if (effectiveTarget === null || effectiveTarget === undefined) continue;
              
              const targetLogic = metric.target_logic || 'greater_than_or_equal';
              let isOnTrack = false;
              
              // Inverse of off-track logic
              switch (targetLogic) {
                case 'greater_than':
                  isOnTrack = value > effectiveTarget;
                  break;
                case 'greater_than_or_equal':
                  isOnTrack = value >= effectiveTarget;
                  break;
                case 'less_than':
                  isOnTrack = value < effectiveTarget;
                  break;
                case 'less_than_or_equal':
                  isOnTrack = value <= effectiveTarget;
                  break;
                case 'equal':
                case 'equal_to':
                  isOnTrack = value === effectiveTarget;
                  break;
                default:
                  isOnTrack = value >= effectiveTarget;
              }
              
              if (isOnTrack) {
                onTrackMetricNames.add(metric.metric_name.toLowerCase());
              }
            }
            
            logger.log(`✅ Found ${onTrackMetricNames.size} metrics that are now on-track`);
            
            if (onTrackMetricNames.size > 0) {
              // Find open metric issues (matching "Below Target" or "Above Target" pattern)
              const { data: openMetricIssues } = await supabase
                .from('issues')
                .select('id, title')
                .eq('team_id', teamId)
                .eq('status', 'open')
                .or('archived.is.null,archived.eq.false');
              
              let resolvedCount = 0;
              
              for (const issue of openMetricIssues || []) {
                // Extract metric name from title - support both old and new formats:
                // Old: "Metric Name Below Target" / "Metric Name Above Target"
                // New: "Metric: Metric Name - Below Target" / "Metric: Metric Name - Above Target"
                const newBelowMatch = issue.title.match(/^Metric:\s*(.+?)\s*-\s*Below Target$/i);
                const newAboveMatch = issue.title.match(/^Metric:\s*(.+?)\s*-\s*Above Target$/i);
                const oldBelowMatch = issue.title.match(/^(.+?)\s+Below Target$/i);
                const oldAboveMatch = issue.title.match(/^(.+?)\s+Above Target$/i);
                const metricName = (newBelowMatch?.[1] || newAboveMatch?.[1] || oldBelowMatch?.[1] || oldAboveMatch?.[1])?.toLowerCase().trim();
                
                if (metricName && onTrackMetricNames.has(metricName)) {
                  // This metric is now on-track - auto-resolve the issue
                  const { error } = await supabase
                    .from('issues')
                    .update({ status: 'resolved', updated_at: new Date().toISOString() })
                    .eq('id', issue.id);
                  
                  if (!error) {
                    resolvedCount++;
                    logger.log(`✅ Auto-resolved issue: "${issue.title}" - metric is now on-track`);
                  }
                }
              }
              
              if (resolvedCount > 0) {
                logger.log(`🎯 Auto-resolved ${resolvedCount} issues for metrics that are now on-track`);
                toast({
                  title: "Issues Auto-resolved",
                  description: `${resolvedCount} issue${resolvedCount === 1 ? '' : 's'} resolved (metric${resolvedCount === 1 ? ' is' : 's are'} now on track)`,
                });
              }
            }
          } catch (error) {
            logger.error('❌ Error auto-resolving metric issues:', error);
          }
        }
      } catch (error) {
        logger.error('❌ Error fetching team metrics:', error);
      }

      // 3. Create issues for off-track goals (both team and company goals are in team_goals table)
      const { data: allGoalsData } = await supabase
        .from('team_goals')
        .select('*')
        .eq('team_id', teamId)
        .eq('status', 'off_track')
        .or('archived.is.null,archived.eq.false');

      logger.log(`🎯 Found ${allGoalsData?.length || 0} off-track goals total`);

      // activeTeamMemberIds is already fetched above (shared across all three scenarios)
      // Filter out goals that are archived or whose owner is no longer on the team
      const validGoalsData = allGoalsData?.filter(goal => {
        // Double-check archived flag client-side to catch edge cases
        // (e.g. archived stored as unexpected truthy value like "" or 0)
        if (goal.archived === true) {
          logger.warn(`⚠️ Skipping auto-issue for goal "${goal.title}" — goal is archived`);
          return false;
        }
        if (memberCheckEnabled && !activeTeamMemberIds.has(goal.owner_id)) {
          logger.warn(`⚠️ Skipping auto-issue for goal "${goal.title}" — owner ${goal.owner_id} is no longer a team member`);
          return false;
        }
        return true;
      }) || [];

      logger.log(`✅ ${validGoalsData.length} goals have valid team member owners (filtered from ${allGoalsData?.length || 0})`);

      // Helper function to get profile name (simplified version for auto-creation)
      const getProfileName = (userId: string): string => {
        // For auto-creation, we'll use "Unknown" as fallback since we don't have access to profiles context
        return 'Unknown';
      };

      // Separate goals by type for processing
      const teamGoals = validGoalsData.filter(goal => !goal.is_company_goal);
      const companyGoals = validGoalsData.filter(goal => goal.is_company_goal);

      logger.log(`🎯 Found ${teamGoals.length} off-track team goals`);
      logger.log(`🏢 Found ${companyGoals.length} off-track company goals`);

      // Process team goals
      for (const goal of teamGoals) {
        try {
          // Import the utility functions here to avoid module-level imports in callback
          const { generateGoalIssueTitle, createGoalIssueData } = await import('@/utils/goalIssueUtils');
          
          // Use the actual is_company_goal value from the database
          const goalData = { ...goal };
          const title = generateGoalIssueTitle(goalData);
          
          if (existingTitles.has(title.toLowerCase())) {
            logger.log(`⏭️ Issue already exists for team goal: ${goal.title}`);
            continue;
          }

          const { data: user } = await supabase.auth.getUser();
          if (!user.user) throw new Error('User not authenticated');

          const issueData = createGoalIssueData(goalData, teamId, user.user.id, getProfileName);

          const { error } = await supabase
            .from('issues')
            .insert(issueData);

          if (error) throw error;

          createdCount++;
          logger.log(`✅ Created issue for off-track team goal: ${goal.title}`);
        } catch (error) {
          logger.error(`❌ Failed to create issue for team goal ${goal.title}:`, error);
        }
      }

      // Process company goals
      for (const goal of companyGoals) {
        try {
          // Import the utility functions here to avoid module-level imports in callback
          const { generateGoalIssueTitle, createGoalIssueData } = await import('@/utils/goalIssueUtils');
          
          // Use the actual is_company_goal value from the database
          const goalData = { ...goal };
          const title = generateGoalIssueTitle(goalData);
          
          if (existingTitles.has(title.toLowerCase())) {
            logger.log(`⏭️ Issue already exists for company goal: ${goal.title}`);
            continue;
          }

          const { data: user } = await supabase.auth.getUser();
          if (!user.user) throw new Error('User not authenticated');

          const issueData = createGoalIssueData(goalData, teamId, user.user.id, getProfileName);

          const { error } = await supabase
            .from('issues')
            .insert(issueData);

          if (error) throw error;

          createdCount++;
          logger.log(`✅ Created issue for off-track company goal: ${goal.title}`);
        } catch (error) {
          logger.error(`❌ Failed to create issue for company goal ${goal.title}:`, error);
        }
      }

      // 4. AUTO-RESOLVE: Mark goal issues as resolved if their goal is no longer off-track
      let goalResolvedCount = 0;
      try {
        logger.log('🔄 Checking for auto-resolvable goal issues...');
        
        // Get all non-archived goals that are NOT off-track (on_track, complete, or canceled)
        // Also include archived goals — if a goal was archived, any open issue for it should be resolved
        const { data: nonOffTrackGoals } = await supabase
          .from('team_goals')
          .select('id, title, is_company_goal, archived')
          .eq('team_id', teamId)
          .or('status.neq.off_track,archived.eq.true');

        if (nonOffTrackGoals && nonOffTrackGoals.length > 0) {
          // Build maps of goal titles that are now on-track or archived (case-insensitive)
          const onTrackTeamGoalTitles = new Set<string>();
          const onTrackCompanyGoalTitles = new Set<string>();
          
          for (const goal of nonOffTrackGoals) {
            if (goal.is_company_goal) {
              onTrackCompanyGoalTitles.add(goal.title.toLowerCase().trim());
            } else {
              onTrackTeamGoalTitles.add(goal.title.toLowerCase().trim());
            }
          }
          
          logger.log(`✅ Found ${onTrackTeamGoalTitles.size} team goals and ${onTrackCompanyGoalTitles.size} company goals that are no longer off-track`);
          
          // Find open goal issues
          const { data: openGoalIssues } = await supabase
            .from('issues')
            .select('id, title')
            .eq('team_id', teamId)
            .eq('status', 'open')
            .or('archived.is.null,archived.eq.false');
          
          for (const issue of openGoalIssues || []) {
            // Pattern 1: "Company Goal off-track: {goal title}"
            const companyMatch = issue.title.match(/^Company Goal off-track:\s*(.+)$/i);
            // Pattern 2: "Goal off-track: {goal title}"  
            const teamMatch = issue.title.match(/^Goal off-track:\s*(.+)$/i);
            
            let shouldResolve = false;
            
            if (companyMatch) {
              const goalTitle = companyMatch[1].toLowerCase().trim();
              shouldResolve = onTrackCompanyGoalTitles.has(goalTitle);
            } else if (teamMatch) {
              const goalTitle = teamMatch[1].toLowerCase().trim();
              shouldResolve = onTrackTeamGoalTitles.has(goalTitle);
            }
            
            if (shouldResolve) {
              const { error } = await supabase
                .from('issues')
                .update({ status: 'resolved', updated_at: new Date().toISOString() })
                .eq('id', issue.id);
              
              if (!error) {
                goalResolvedCount++;
                logger.log(`✅ Auto-resolved goal issue: "${issue.title}" - goal is no longer off-track`);
              }
            }
          }
          
          if (goalResolvedCount > 0) {
            logger.log(`🎯 Auto-resolved ${goalResolvedCount} goal issues`);
            toast({
              title: "Goal Issues Auto-resolved",
              description: `${goalResolvedCount} issue${goalResolvedCount === 1 ? '' : 's'} resolved (goal${goalResolvedCount === 1 ? ' is' : 's are'} no longer off-track)`,
            });
          }
        }
      } catch (error) {
        logger.error('❌ Error auto-resolving goal issues:', error);
      }

      if (createdCount > 0) {
        logger.log(`🎯 Auto-created ${createdCount} issues`);
        toast({
          title: "Issues Auto-created",
          description: `Created ${createdCount} issue${createdCount === 1 ? '' : 's'} for overdue items`,
        });
      } else {
        logger.log('📝 No overdue items found - no issues created');
      }

      return createdCount;
    } catch (error) {
      logger.error('❌ Error auto-creating issues:', error);
      toast({
        title: "Failed to Auto-create Issues",
        description: "There was an error creating issues automatically",
        variant: "destructive",
      });
      return 0;
    }
  }, [toast]);

  // Lock to prevent concurrent auto-create calls
  const isCreatingIssuesRef = useRef(false);
  
  // Track if auto-create has been triggered for the current meeting (persists across section navigation)
  const hasTriggeredAutoCreateForMeetingRef = useRef<string | null>(null);
  
  // Reset the trigger flag when meeting changes or ends
  useEffect(() => {
    if (meetingId !== hasTriggeredAutoCreateForMeetingRef.current) {
      logger.log('🔄 AUTO-CREATE: Meeting changed, resetting trigger flag', { 
        oldMeeting: hasTriggeredAutoCreateForMeetingRef.current, 
        newMeeting: meetingId 
      });
      hasTriggeredAutoCreateForMeetingRef.current = null;
    }
  }, [meetingId]);

  // Trigger auto-create issues when navigating to Issues section
  // Per-meeting tracking prevents duplicates from section navigation; lock prevents race conditions
  const triggerAutoCreateIssues = useCallback(async (teamId: string) => {
    // Skip if already triggered for this specific meeting
    if (hasTriggeredAutoCreateForMeetingRef.current === meetingId && meetingId) {
      logger.log('⏸️ AUTO-CREATE: Already triggered for this meeting, skipping');
      return;
    }
    
    if (isCreatingIssuesRef.current) {
      logger.log('⏸️ AUTO-CREATE: Already in progress, skipping');
      return;
    }
    
    isCreatingIssuesRef.current = true;
    hasTriggeredAutoCreateForMeetingRef.current = meetingId; // Mark as triggered for this meeting
    
    logger.log('🎯 AUTO-CREATE: Triggering auto-creation for Issues section navigation');
    
    try {
      const createdCount = await createIssuesForOverdueItems(teamId);
      logger.log('🎯 AUTO-CREATE: Created', createdCount, 'issues for off-track items');
    } catch (error) {
      logger.error('❌ AUTO-CREATE: Failed:', error);
    } finally {
      isCreatingIssuesRef.current = false;
    }
  }, [createIssuesForOverdueItems, meetingId]);

  const formatDuration = useCallback((ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, []);

  // Use real-time database calculations instead of local timer
  const calculations = useMemo(() => realTimeDurations, [realTimeDurations]);

  // Derived properties
  const canControlTimer = currentRole === 'scriber';
  
  const isOvertime = useCallback((targetMs: number) => {
    return calculations.overallDurationMs > targetMs;
  }, [calculations.overallDurationMs]);

  const updateTimerCalculations = useCallback(async () => {
    if (!meetingId || !isRunning) {
      return;
    }

    try {
      const { data, error } = await supabase.rpc('calculate_meeting_duration', {
        p_meeting_state_id: meetingId,
        p_current_time: new Date().toISOString()
      });

      if (error) {
        logger.error('❌ Error calculating meeting duration:', error);
        return;
      }

      if (data) {
        // Combine previously accumulated time for current section with current run
        const prevAccumulated = timerState.sectionAccumulatedTimes?.[timerState.currentSection] || 0;
        const sectionAccumulatedMs = prevAccumulated + (data.section_duration_ms || 0);

        const newCalculations = {
          overallDurationMs: data.overall_duration_ms || 0,
          sectionDurationMs: data.section_duration_ms || 0,
          sectionAccumulatedMs,
          activeDurationMs: data.overall_duration_ms || 0,
        };
        
        setRealTimeDurations(newCalculations);
      }
    } catch (error) {
      logger.error('❌ Error updating timer calculations:', error);
    }
  }, [meetingId, isRunning, timerState.currentSection, timerState.sectionAccumulatedTimes]);

  // Scriber heartbeat mechanism
  const updateScriiberHeartbeat = useCallback(async () => {
    if (!meetingId || !currentUserId || currentRole !== 'scriber') return;

    try {
      await supabase.rpc('update_scriber_heartbeat', {
        p_meeting_state_id: meetingId
      });
    } catch (error) {
      logger.error('Error updating scriber heartbeat:', error);
    }
  }, [meetingId, currentUserId, currentRole]);

  // Start heartbeat when user becomes scriber
  useEffect(() => {
    if (currentRole === 'scriber' && meetingId) {
      // Update heartbeat immediately
      updateScriiberHeartbeat();
      
      // Set up regular heartbeat (every 30 seconds)
      heartbeatRef.current = setInterval(updateScriiberHeartbeat, 30000);
      
      return () => {
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
          heartbeatRef.current = null;
        }
      };
    }
  }, [currentRole, meetingId, updateScriiberHeartbeat]);

  // Enhanced real-time subscription with better scriber state handling
  useEffect(() => {
    if (!meetingId) return;

    logger.log('🔔 Setting up real-time subscription for meeting:', meetingId);
    
    realtimeSubscription.current = supabase
      .channel(`meeting_${meetingId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'meetings_state',
          filter: `id=eq.${meetingId}`
        },
        async (payload) => {
          logger.log('🔔 Meeting state updated via postgres_changes:', payload);
          const oldData = payload.old as any;
          const newData = payload.new as any;
          
          // ✅ VALIDAÇÃO EXPLÍCITA: Detectar mudança de section
          const oldSection = oldData?.current_section ?? -1;
          const newSection = newData?.current_section ?? 0;
          const sectionChanged = oldSection !== newSection;
          
          if (sectionChanged) {
            logger.log('🔄 [POSTGRES_CHANGES] Section change detected:', { 
              oldSection, 
              newSection,
              sectionStartTime: newData.section_start_time,
              timestamp: new Date().toISOString()
            });
            
            // 🔍 TELEMETRY: Log postgres_changes section updates (suspected refresh trigger)
            logRefreshTrigger('meeting-state-postgres-change', {
              meetingId,
              oldSection,
              newSection,
              status: newData.status,
            });
          }
          
          // Check if meeting has ended and redirect all participants to tasks
          if (newData.status === 'ended') {
            logger.log('🏁 Meeting ended detected via real-time subscription');
            
            // Clean up local state and subscriptions
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }

            if (realtimeSubscription.current) {
              supabase.removeChannel(realtimeSubscription.current);
              realtimeSubscription.current = null;
            }

            // Reset all local state
            setIsRunning(false);
            setMeetingId(null);
            setCurrentRole(null);
            setScriberId(null);
            setTimerState(initialTimerState);
            setRealTimeDurations({
              overallDurationMs: 0,
              sectionDurationMs: 0,
              sectionAccumulatedMs: 0,
              activeDurationMs: 0,
            });
            setRecentlyEndedMeeting(true);

            // Navigate ALL participants (not just scriber) to /tasks
            // Only navigate if we're currently on the meeting page
            const currentPath = window.location.pathname;
            if (currentPath.includes('/meeting/')) {
              logger.log('🔄 Redirecting participant to /tasks after meeting ended');
              // This provider is above <Router>, so we must use window.location
              window.location.href = '/tasks';
            } else {
              logger.log('✅ Meeting state cleaned up, user not on meeting page');
            }
            
            return; // Don't process other updates if meeting ended
          }
          
          // Update scriber ID with immediate effect
          const newScriberId = newData.scriber_id;
          if (newScriberId !== scriberId) {
            logger.log('📝 Scriber ID updated via Postgres Changes:', { old: scriberId, new: newScriberId });
            setScriberId(newScriberId);
            // Also update current role if the current user became scriber
            if (newScriberId === currentUserId) {
              setCurrentRole('scriber');
            }
          }
          
          // Update timer state with explicit section change handling
          setTimerState(prevState => {
            const newIsPaused = newData.is_paused === true;
            
            // Only update isPaused if it actually changed to prevent subscription overrides
            const shouldUpdatePause = newIsPaused !== prevState.isPaused;
            
            if (shouldUpdatePause) {
              logger.log('⏸️ Realtime: Pause state changed from', prevState.isPaused, 'to', newIsPaused);
            }
            
            // ✅ CRÍTICO: Se section mudou, usar dados do banco (fonte da verdade)
            // Se não mudou, manter estado atual para evitar sobrescrever atualizações locais
            const shouldUpdateSection = sectionChanged || prevState.currentSection !== newSection;
            
            return {
              ...prevState,
              // Só atualizar section se realmente mudou (evita race conditions)
              currentSection: shouldUpdateSection ? newSection : prevState.currentSection,
              isPaused: shouldUpdatePause ? newIsPaused : prevState.isPaused,
              // Atualizar sectionStartTime apenas se section mudou
              sectionStartTime: shouldUpdateSection && newData.section_start_time
                ? new Date(newData.section_start_time).getTime()
                : prevState.sectionStartTime,
              meetingStartTime: newData.started_at ? new Date(newData.started_at).getTime() : prevState.meetingStartTime,
              sectionAccumulatedTimes: newData.section_accumulated_times || prevState.sectionAccumulatedTimes,
            };
          });
          
          // Update role if current user's role changed
          if (newData.role_assignments) {
            const currentUserId = (await supabase.auth.getUser()).data.user?.id;
            if (currentUserId && newData.role_assignments[currentUserId]) {
              const newRole = newData.role_assignments[currentUserId];
              if (newRole !== currentRole) {
                logger.log('👤 User role updated:', { userId: currentUserId, role: newRole });
                setCurrentRole(newRole);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      if (realtimeSubscription.current) {
        supabase.removeChannel(realtimeSubscription.current);
        realtimeSubscription.current = null;
      }
    };
  }, [meetingId]);

  // Set up timer for real-time calculations
  useEffect(() => {
    if (!isRunning || !meetingId) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    
    // Update calculations every second regardless of pause state
    // The RPC function handles pause state correctly, so we always call it
    timerRef.current = setInterval(() => {
      updateTimerCalculations();
    }, 1000);
    
    // Initial update
    updateTimerCalculations();

    return () => {
      logger.log('⏰ Cleaning up timer interval');
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRunning, meetingId, timerState.isPaused, updateTimerCalculations]);

  // Clear recently ended meeting flag after cooldown
  useEffect(() => {
    if (recentlyEndedMeeting) {
      const timeout = setTimeout(() => {
        logger.log('🔄 NewMeetingTimerContext: Clearing recently ended meeting flag');
        setRecentlyEndedMeeting(false);
      }, 5000);

      return () => clearTimeout(timeout);
    }
  }, [recentlyEndedMeeting]);

  // Helper function to attach pending headlines to newly created meeting
  const attachPendingHeadlines = async (meetingId: string, teamId: string, meetingType: string): Promise<number> => {
    logger.log('📎 AUTO-ATTACH: Looking for pending headlines for:', { teamId, meetingType });
    
    try {
      // Find all pending headlines for this team and meeting type (created before meeting started)
      const meetingStartTime = new Date().toISOString();
      const { data: pendingHeadlines, error: fetchError } = await supabase
        .from('headlines')
        .select('id, title')
        .eq('team_id', teamId)
        .eq('target_meeting_type', meetingType)
        .is('meeting_id', null)
        .lt('created_at', meetingStartTime);

      if (fetchError) {
        logger.error('❌ AUTO-ATTACH: Error fetching pending headlines:', fetchError);
        return 0;
      }

      if (!pendingHeadlines || pendingHeadlines.length === 0) {
        logger.log('📎 AUTO-ATTACH: No pending headlines found');
        return 0;
      }

      logger.log('📎 AUTO-ATTACH: Found pending headlines:', pendingHeadlines);

      // Attach all pending headlines to this meeting
      const headlineIds = pendingHeadlines.map(h => h.id);
      const { error: updateError } = await supabase
        .from('headlines')
        .update({ meeting_id: meetingId })
        .in('id', headlineIds);

      if (updateError) {
        logger.error('❌ AUTO-ATTACH: Error attaching headlines:', updateError);
        return 0;
      }

      logger.log('✅ AUTO-ATTACH: Successfully attached', pendingHeadlines.length, 'headlines');
      return pendingHeadlines.length;
    } catch (error) {
      logger.error('❌ AUTO-ATTACH: Unexpected error:', error);
      return 0;
    }
  };

  const startMeeting = useCallback(async (teamId: string, role: MeetingRole, meetingType: string = 'weekly'): Promise<void> => {
    logger.log('🔄 NewMeetingTimerContext: Starting meeting as', role, 'for team', teamId, 'type:', meetingType);

    try {
      // Trigger optimistic update in onboarding context by dispatching event
      logger.log('🎯 NewMeetingTimerContext: Dispatching optimistic meeting creation event');
      const optimisticEvent = new CustomEvent('optimistic-meeting-creation');
      window.dispatchEvent(optimisticEvent);
      logger.log('🎯 NewMeetingTimerContext: Optimistic meeting creation event dispatched');
      
      const now = new Date().toISOString();
      const currentUserId = (await supabase.auth.getUser()).data.user?.id;
      
      if (!currentUserId) {
        throw new Error('User not authenticated');
      }

      // CRITICAL: Fetch company_id from the team to ensure proper company-scoped sync
      let companyId: string | null = null;
      try {
        const { data: teamData } = await supabase
          .from('teams')
          .select('company_id')
          .eq('id', teamId)
          .single();
        companyId = teamData?.company_id || null;
        logger.log('📍 NewMeetingTimerContext: Got company_id from team:', companyId);
      } catch (err) {
        logger.warn('⚠️ NewMeetingTimerContext: Could not fetch company_id for team:', err);
      }

      // Create meeting state record with company_id for proper sync
      const { data, error } = await supabase
        .from('meetings_state')
        .insert([{
          team_id: teamId,
          company_id: companyId, // CRITICAL: Include company_id for proper real-time sync
          status: 'active',
          started_at: now,
          started_by: currentUserId,
          scriber_id: role === 'scriber' ? currentUserId : null,
          meeting_type: meetingType,
          current_section: 0,
          section_start_time: now,
          section_durations: {},
          section_accumulated_times: {},
          is_paused: false,
          total_pause_duration: 0,
          role_assignments: {
            [currentUserId]: role
          }
        }])
        .select()
        .single();

      if (error) {
        logger.error('❌ NewMeetingTimerContext: Error starting meeting:', error);
        throw error;
      }

      setIsRunning(true);
      setMeetingId(data.id);
      setCurrentRole(role);
      const newScriberId = role === 'scriber' ? currentUserId : null;
      setScriberId(newScriberId);
      
      // Broadcast scriber change for instant sync (with fallback for race condition)
      if (role === 'scriber' && newScriberId) {
        // Use setTimeout to ensure broadcast ref is ready (handles race condition)
        setTimeout(() => {
          if (scriberBroadcastRef.current) {
            logger.log('📤 NewMeetingTimerContext: Broadcasting scriber change on meeting start');
            scriberBroadcastRef.current(newScriberId);
          } else {
            logger.warn('⚠️ Scriber broadcast ref not ready, will sync via Postgres Changes');
          }
        }, 100);
      }

      setTimerState({
        currentSection: 0,
        sectionStartTime: Date.now(),
        meetingStartTime: Date.now(),
        sectionDurations: [],
        sectionAccumulatedTimes: {},
        isPaused: false,
      });

      logger.log('✅ NewMeetingTimerContext: Meeting started successfully with ID:', data.id);
      trackFBSQLOnce({
        userId: currentUserId,
        meetingId: data.id,
        companyId,
        teamId,
        meetingType,
      });
      toast({
        title: "Meeting Started",
        description: "The meeting timer has started.",
      });

      // Track l10_started event for Statsig
      try {
        const { trackL10Started, trackQuarterlyReviewStarted, trackAnnualReviewStarted, trackCustomMeetingStarted } = await import('@/lib/statsigAnalytics');
        
        // Track based on meeting type
        if (meetingType === 'quarterly') {
          trackQuarterlyReviewStarted({
            user_id: currentUserId,
            company_id: companyId || undefined,
            review_id: data.id,
            attendee_count: 1, // Initial count, will grow as participants join
          });
        } else if (meetingType === 'annual') {
          trackAnnualReviewStarted({
            user_id: currentUserId,
            company_id: companyId || undefined,
            review_id: data.id,
            attendee_count: 1,
          });
        } else if (meetingType === 'custom') {
          trackCustomMeetingStarted({
            user_id: currentUserId,
            company_id: companyId || undefined,
            meeting_id: data.id,
            attendee_count: 1,
          });
        } else {
          // Weekly L10 meeting
          trackL10Started({
            user_id: currentUserId,
            company_id: companyId || undefined,
            meeting_id: data.id,
            meeting_type: meetingType
          });
        }
      } catch (e) {
        logger.warn('Failed to track meeting creation:', e);
      }

      // Auto-attach pending headlines immediately after meeting creation
      logger.log('📎 AUTO-ATTACH: Triggering headline attachment for meeting:', data.id);
      try {
        const attachedCount = await attachPendingHeadlines(data.id, teamId, meetingType);
        if (attachedCount > 0) {
          logger.log('📎 AUTO-ATTACH: Successfully attached', attachedCount, 'headlines to meeting');
        }
      } catch (error) {
        logger.error('❌ AUTO-ATTACH: Headline attachment failed:', error);
        // Don't throw - this is not critical to meeting start
      }

      // Broadcast that meeting started (for participants list)
      await broadcastParticipantsChanged(data.id, 'join');

      // 📤 BROADCAST: Meeting started for instant sync to other users (header + meetings list)
      // This follows the correct flow: User -> DB -> Realtime -> Users
      if (meetingStartedBroadcastRef.current) {
        logger.log('📤 NewMeetingTimerContext: Broadcasting meeting_started after DB insert', { meetingId: data.id, teamId, meetingType });
        meetingStartedBroadcastRef.current(teamId, meetingType, {
          id: data.id,
          team_id: teamId,
          team_name: '', // Will be enriched by receiver from local state
          company_name: '',
          meeting_type: meetingType,
          current_section: 0,
          started_at: now,
          status: 'active',
          scriber_id: role === 'scriber' ? currentUserId : null
        });
      } else {
        logger.warn('⚠️ Meeting started broadcast ref not ready, will sync via Postgres Changes');
      }

      // Auto-create issues is now triggered when navigating to Issues section
      // This ensures off-track items marked during the meeting are also captured
      logger.log('ℹ️ AUTO-CREATE: Will be triggered when navigating to Issues section');
    } catch (error) {
      logger.error('❌ NewMeetingTimerContext: Error starting meeting:', error);
      toast({
        title: "Failed to Start Meeting",
        description: "There was an error starting the meeting. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  const joinExistingMeeting = useCallback(async (meetingId: string, role: MeetingRole): Promise<void> => {
    logger.log('🔄 NewMeetingTimerContext: Joining existing meeting', meetingId, 'as', role);

    try {
      const currentUserId = (await supabase.auth.getUser()).data.user?.id;
      
      if (!currentUserId) {
        throw new Error('User not authenticated');
      }

      // Get existing meeting data
      const { data: meetingData, error: fetchError } = await supabase
        .from('meetings_state')
        .select('*')
        .eq('id', meetingId)
        .eq('status', 'active')
        .maybeSingle();

      if (fetchError) {
        throw new Error('Error fetching meeting: ' + fetchError.message);
      }

      if (!meetingData) {
        throw new Error('Meeting not found or no longer active');
      }

      // Update role assignments and scriber if needed
      const updatedRoleAssignments = {
        ...meetingData.role_assignments,
        [currentUserId]: role
      };

      const updateData: any = {
        role_assignments: updatedRoleAssignments
      };

      // If joining as scriber, set as scriber (allows takeover if scriber already exists)
      if (role === 'scriber') {
        updateData.scriber_id = currentUserId;
      }

      const { error: updateError } = await supabase
        .from('meetings_state')
        .update(updateData)
        .eq('id', meetingId);

      if (updateError) {
        logger.error('❌ NewMeetingTimerContext: Error updating meeting role assignments:', updateError);
        throw updateError;
      }

      // Set local state to sync with existing meeting
      setIsRunning(true);
      setMeetingId(meetingId);
      setCurrentRole(role);
      const newScriberId = updateData.scriber_id || meetingData.scriber_id;
      setScriberId(newScriberId);
      
      // Broadcast scriber change if joining as scriber (with fallback for race condition)
      if (role === 'scriber' && newScriberId) {
        // Use setTimeout to ensure broadcast ref is ready (handles race condition)
        setTimeout(() => {
          if (scriberBroadcastRef.current) {
            logger.log('📤 NewMeetingTimerContext: Broadcasting scriber change on join', { 
              old: meetingData.scriber_id, 
              new: newScriberId 
            });
            scriberBroadcastRef.current(newScriberId);
          } else {
            logger.warn('⚠️ Scriber broadcast ref not ready, will sync via Postgres Changes');
          }
        }, 100);
      }

      // Calculate time since meeting started
      const meetingStartTime = new Date(meetingData.started_at).getTime();
      const sectionStartTime = new Date(meetingData.section_start_time).getTime();
      
      setTimerState({
        currentSection: meetingData.current_section || 0,
        sectionStartTime,
        meetingStartTime,
        sectionDurations: Object.values(meetingData.section_durations || {}),
        sectionAccumulatedTimes: meetingData.section_accumulated_times || {},
        isPaused: meetingData.is_paused === true,
      });

      // Broadcast to all participants that someone joined
      await broadcastParticipantsChanged(meetingId, 'join');

      logger.log('✅ NewMeetingTimerContext: Successfully joined existing meeting');
      toast({
        title: "Joined Meeting",
        description: `You've joined the meeting as a ${role}.`,
      });
    } catch (error) {
      logger.error('❌ NewMeetingTimerContext: Error joining existing meeting:', error);
      toast({
        title: "Failed to Join Meeting",
        description: "There was an error joining the meeting. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  const takeOverAsScriber = useCallback(async (): Promise<void> => {
    logger.log('🔄 NewMeetingTimerContext: Taking over as scriber');

    if (!meetingId || !currentUserId) {
      throw new Error('No active meeting or user not authenticated');
    }

    try {
      // Get current meeting data to update role_assignments
      const { data: meetingData, error: fetchError } = await supabase
        .from('meetings_state')
        .select('role_assignments')
        .eq('id', meetingId)
        .single();

      if (fetchError || !meetingData) {
        throw new Error('Meeting not found');
      }

      // Update both scriber_id AND role_assignments in single transaction
      const updatedRoleAssignments = {
        ...meetingData.role_assignments,
        [currentUserId]: 'scriber'
      };

      const { error } = await supabase
        .from('meetings_state')
        .update({ 
          scriber_id: currentUserId,
          role_assignments: updatedRoleAssignments,
          scriber_last_activity: new Date().toISOString()
        })
        .eq('id', meetingId);

      if (error) {
        logger.error('❌ NewMeetingTimerContext: Error taking over as scriber:', error);
        throw error;
      }

      // Update local state immediately for responsive UI
      setCurrentRole('scriber');
      setScriberId(currentUserId);

      // Broadcast scriber change for instant sync (with fallback for race condition)
      setTimeout(() => {
        if (scriberBroadcastRef.current) {
          logger.log('📤 NewMeetingTimerContext: Broadcasting scriber change on takeover');
          scriberBroadcastRef.current(currentUserId);
        } else {
          logger.warn('⚠️ Scriber broadcast ref not ready, will sync via Postgres Changes');
        }
      }, 100);

      logger.log('✅ NewMeetingTimerContext: Successfully took over as scriber with role_assignments sync');
      toast({
        title: "Scriber Role Acquired",
        description: "You are now the meeting scriber and can control the timer.",
      });
    } catch (error) {
      logger.error('❌ NewMeetingTimerContext: Error taking over as scriber:', error);
      toast({
        title: "Failed to Take Over",
        description: "Could not take over as scriber. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  }, [meetingId, currentUserId, scriberId, toast]);

  const leaveMeeting = useCallback(async (): Promise<void> => {
    logger.log('🔄 NewMeetingTimerContext: Leaving meeting');
    
    try {
      const currentUserId = (await supabase.auth.getUser()).data.user?.id;
      
      if (!currentUserId || !meetingId) {
        throw new Error('User not authenticated or no active meeting');
      }

      // Get current meeting data
      const { data: meetingData, error: fetchError } = await supabase
        .from('meetings_state')
        .select('*')
        .eq('id', meetingId)
        .single();

      if (fetchError || !meetingData) {
        throw new Error('Meeting not found');
      }

      // Remove current user from role assignments
      const updatedRoleAssignments = { ...meetingData.role_assignments };
      delete updatedRoleAssignments[currentUserId];

      // If current user was the scriber, log the transfer
      if (meetingData.scriber_id === currentUserId) {
        // Log scriber departure
        await supabase
          .from('scriber_transfer_log')
          .insert({
            meeting_state_id: meetingId,
            old_scriber_id: currentUserId,
            new_scriber_id: null,
            transfer_type: 'scriber_left',
            notes: 'Scriber left the meeting'
          });
      }

      // Remove current user from role assignments
      const remainingUserIds = Object.keys(updatedRoleAssignments);
      let newScriberId = meetingData.scriber_id;
      
      // If scriber is leaving, clear scriber role for now
      if (meetingData.scriber_id === currentUserId) {
        newScriberId = null;
      }

      // Update meeting state in database
      const { error: updateError } = await supabase
        .from('meetings_state')
        .update({
          role_assignments: updatedRoleAssignments,
          scriber_id: newScriberId
        })
        .eq('id', meetingId);

      if (updateError) {
        logger.error('❌ NewMeetingTimerContext: Error leaving meeting:', updateError);
        throw updateError;
      }

      // Clean up local state and subscriptions
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (realtimeSubscription.current) {
        supabase.removeChannel(realtimeSubscription.current);
        realtimeSubscription.current = null;
      }

      // Reset all local state
      setIsRunning(false);
      setMeetingId(null);
      setCurrentRole(null);
      setScriberId(null);
      setTimerState(initialTimerState);
      setRealTimeDurations({
        overallDurationMs: 0,
        sectionDurationMs: 0,
        sectionAccumulatedMs: 0,
        activeDurationMs: 0,
      });
      
      // Broadcast to all participants that someone left
      await broadcastParticipantsChanged(meetingId, 'leave');
      
      logger.log('✅ NewMeetingTimerContext: Successfully left meeting');
      toast({
        title: "Left Meeting",
        description: "You have left the meeting successfully.",
      });
    } catch (error) {
      logger.error('❌ NewMeetingTimerContext: Error leaving meeting:', error);
      toast({
        title: "Failed to Leave Meeting",
        description: "There was an error leaving the meeting. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  }, [meetingId, toast]);

  const endMeeting = useCallback(async (): Promise<void> => {
    logger.log('🔄 NewMeetingTimerContext: Ending meeting (local cleanup only)');
    
    try {
      // Clean up local timers and subscriptions
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (realtimeSubscription.current) {
        supabase.removeChannel(realtimeSubscription.current);
        realtimeSubscription.current = null;
      }

      // Track meeting completion in analytics (before resetting state)
      if (meetingId) {
        const meetingType = currentRole || 'unknown';
        const durationMinutes = Math.round((realTimeDurations.overallDurationMs || 0) / 60000);
        import('@/lib/analytics').then(({ trackMeetingCompleted }) => {
          trackMeetingCompleted(meetingType, durationMinutes);
        });
      }

      // NOTE: Database update is handled by finalizeMeeting() in useMeetingOperations
      // This function only handles local state cleanup to prevent duplicate DB writes

      // Capture meetingId before resetting state for broadcast
      const currentMeetingId = meetingId;

      // Reset all local state
      setIsRunning(false);
      setMeetingId(null);
      setCurrentRole(null);
      setScriberId(null);
      setTimerState(initialTimerState);
      setRealTimeDurations({
        overallDurationMs: 0,
        sectionDurationMs: 0,
        sectionAccumulatedMs: 0,
        activeDurationMs: 0,
      });
      setRecentlyEndedMeeting(true);
      
      // Broadcast to all participants that meeting ended
      if (currentMeetingId) {
        await broadcastParticipantsChanged(currentMeetingId, 'end');
      }
      
      logger.log('✅ NewMeetingTimerContext: Local meeting cleanup completed');
    } catch (error) {
      logger.error('❌ NewMeetingTimerContext: Error ending meeting:', error);
      throw error;
    }
  }, [meetingId]);

  const pauseMeeting = useCallback(async (reason?: string): Promise<void> => {
    logger.log('⏸️ NewMeetingTimerContext: Pausing meeting using virtual section change');

    if (!meetingId) {
      logger.log('❌ Cannot pause: No meetingId');
      return;
    }
    
    if (!canControlTimer) {
      logger.log('❌ Cannot pause: User cannot control timer (not scriber)');
      return;
    }

    try {
      // Get current meeting data to save the current section
      const { data: currentData, error: fetchError } = await supabase
        .from('meetings_state')
        .select('*')
        .eq('id', meetingId)
        .single();

      if (fetchError || !currentData) {
        logger.error('❌ Error fetching current meeting data for pause:', fetchError);
        return;
      }

      const currentSectionIndex = currentData.current_section || 0;
      
      // Save which section we're pausing from
      setSectionBeforePause(currentSectionIndex);
      
      logger.log('⏸️ Saving section before pause:', currentSectionIndex);

      // Calculate current section duration using RPC function
      const { data: durationData, error: durationError } = await supabase.rpc('calculate_meeting_duration', {
        p_meeting_state_id: meetingId
      });

      if (durationError) {
        logger.error('❌ Error calculating section duration for pause:', durationError);
        return;
      }

      // Update accumulated times with current section's duration (like in changeSection)
      const currentAccumulatedTimes = currentData.section_accumulated_times || {};
      const updatedAccumulatedTimes = {
        ...currentAccumulatedTimes,
        [currentSectionIndex]: (currentAccumulatedTimes[currentSectionIndex] || 0) + (durationData?.section_duration_ms || 0)
      };

      logger.log('⏸️ Saving accumulated time for section', currentSectionIndex, ':', durationData?.section_duration_ms || 0, 'ms');

      const now = new Date().toISOString();
      
      // Switch to virtual "pause section" (-1) and set pause flag
      const { error } = await supabase
        .from('meetings_state')
        .update({
          current_section: -1, // Virtual pause section
          section_start_time: now,
          section_accumulated_times: updatedAccumulatedTimes,
          is_paused: true,
          last_pause_timestamp: now
        })
        .eq('id', meetingId);

      if (error) {
        logger.error('❌ Error pausing meeting in database:', error);
        throw error;
      }

      setTimerState(prevState => ({
        ...prevState,
        currentSection: -1, // Virtual pause section
        sectionStartTime: Date.now(),
        sectionAccumulatedTimes: updatedAccumulatedTimes,
        isPaused: true,
      }));
      
      logger.log('✅ Meeting paused successfully using virtual section change');
    } catch (error) {
      logger.error('❌ NewMeetingTimerContext: Error pausing meeting:', error);
    }
  }, [meetingId, canControlTimer, currentRole]);

  const resumeMeeting = useCallback(async (): Promise<void> => {
    logger.log('▶️ NewMeetingTimerContext: Resuming meeting using virtual section change back');

    if (!meetingId || !canControlTimer) return;

    if (sectionBeforePause === null) {
      logger.error('❌ Cannot resume: No section before pause saved');
      return;
    }

    try {
      // Get current meeting data to calculate pause duration
      const { data: meetingData, error: fetchError } = await supabase
        .from('meetings_state')
        .select('total_pause_duration, last_pause_timestamp')
        .eq('id', meetingId)
        .single();

      if (fetchError) {
        logger.error('❌ Error fetching meeting data for resume:', fetchError);
        throw fetchError;
      }

      // Calculate accumulated pause duration
      let totalPauseDuration = meetingData.total_pause_duration || 0;
      if (meetingData.last_pause_timestamp) {
        const pauseStart = new Date(meetingData.last_pause_timestamp);
        const pauseEnd = new Date();
        const pauseDurationMs = pauseEnd.getTime() - pauseStart.getTime();
        totalPauseDuration += pauseDurationMs;
        
        logger.log('▶️ Accumulated pause duration:', {
          previousTotal: meetingData.total_pause_duration,
          thisPause: pauseDurationMs,
          newTotal: totalPauseDuration
        });
      }

      const now = new Date().toISOString();
      
      logger.log('▶️ Switching back from pause to section:', sectionBeforePause);

      // Switch back to the section we were in before pause (like changeSection)
      const { error } = await supabase
        .from('meetings_state')
        .update({
          current_section: sectionBeforePause,
          section_start_time: now, // Fresh start time for resumed section
          is_paused: false,
          last_pause_timestamp: null,
          total_pause_duration: totalPauseDuration
        })
        .eq('id', meetingId);

      if (error) {
        logger.error('❌ Error resuming meeting:', error);
        throw error;
      }

      setTimerState(prevState => ({
        ...prevState,
        currentSection: sectionBeforePause,
        sectionStartTime: Date.now(), // Fresh start time for resumed section
        isPaused: false,
      }));

      // Clear the saved section
      setSectionBeforePause(null);
      
      logger.log('✅ Meeting resumed successfully using virtual section change back to section', sectionBeforePause);
    } catch (error) {
      logger.error('❌ NewMeetingTimerContext: Error resuming meeting:', error);
    }
  }, [meetingId, canControlTimer, sectionBeforePause]);

  // Alias methods for compatibility
  const pauseTimer = pauseMeeting;
  const resumeTimer = resumeMeeting;

  // Ref for broadcast function (set externally by Meeting.tsx)
  const sectionBroadcastRef = useRef<((sectionIndex: number, sectionStartTime: number) => void) | null>(null);

  // Setter for external broadcast function
  const setSectionBroadcast = useCallback((fn: (sectionIndex: number, sectionStartTime: number) => void) => {
    sectionBroadcastRef.current = fn;
  }, []);

  // Ref for scriber broadcast function (set externally by Meeting.tsx)
  const scriberBroadcastRef = useRef<((scriberId: string | null) => void) | null>(null);

  // Setter for external scriber broadcast function
  const setScriberBroadcast = useCallback((fn: (scriberId: string | null) => void) => {
    scriberBroadcastRef.current = fn;
  }, []);

  // Ref for meeting started broadcast function (set externally by Meeting.tsx)
  const meetingStartedBroadcastRef = useRef<((teamId: string, meetingType: string, meetingData: any) => void) | null>(null);

  // Setter for external meeting started broadcast function
  const setMeetingStartedBroadcast = useCallback((fn: (teamId: string, meetingType: string, meetingData: any) => void) => {
    meetingStartedBroadcastRef.current = fn;
  }, []);

  // Apply remote scriber change from broadcast (for participants receiving scriber changes)
  const applyRemoteScriberChange = useCallback((newScriberId: string | null) => {
    logger.log('📡 NewMeetingTimerContext: Applying remote scriber change', { newScriberId });
    setScriberId(newScriberId);
    // Also update current role if the current user became scriber
    if (newScriberId === currentUserId) {
      setCurrentRole('scriber');
    }
  }, [currentUserId]);

  const changeSection = useCallback(async (sectionIndex: number): Promise<void> => {
    logger.log('🔄 NewMeetingTimerContext: Changing to section', sectionIndex);

    if (!meetingId || !canControlTimer) return;

    const nowMs = Date.now();
    const now = new Date(nowMs).toISOString();

    // Capture rollback values before applying optimistic update
    const rollbackSection = timerStateRef.current.currentSection;
    const rollbackSectionStartTime = timerStateRef.current.sectionStartTime;

    // OPTIMISTIC UI UPDATE: switch the section locally immediately so the
    // scriber sees instant feedback. The DB writes happen in the background.
    setTimerState(prevState => ({
      ...prevState,
      currentSection: sectionIndex,
      sectionStartTime: nowMs,
    }));

    // OPTIMISTIC BROADCAST: notify other participants now so they also feel
    // the change instantly. If the DB write later fails we'll broadcast a rollback.
    if (sectionBroadcastRef.current) {
      logger.log('📤 NewMeetingTimerContext: Broadcasting section change (optimistic)');
      sectionBroadcastRef.current(sectionIndex, nowMs);
    }

    try {
      // Run the fetch + duration RPC in parallel to compute accurate
      // accumulated time for the section we're leaving.
      const [currentResult, durationResult] = await Promise.all([
        supabase.from('meetings_state').select('*').eq('id', meetingId).single(),
        supabase.rpc('calculate_meeting_duration', { p_meeting_state_id: meetingId }),
      ]);

      if (currentResult.error || !currentResult.data) {
        throw currentResult.error || new Error('Failed to fetch meeting data');
      }
      if (durationResult.error) {
        throw durationResult.error;
      }

      const currentData = currentResult.data;
      const durationData = durationResult.data;

      // Use the section recorded in the DB as the "leaving" section so
      // accumulated time is added to the correct bucket regardless of any
      // intervening optimistic local updates.
      const leavingSectionIndex = currentData.current_section || 0;
      const currentAccumulatedTimes = currentData.section_accumulated_times || {};
      const updatedAccumulatedTimes = {
        ...currentAccumulatedTimes,
        [leavingSectionIndex]: (currentAccumulatedTimes[leavingSectionIndex] || 0) + (durationData?.section_duration_ms || 0)
      };

      logger.log('📊 Saving accumulated time for section', leavingSectionIndex, ':', durationData?.section_duration_ms || 0, 'ms');

      const { error } = await supabase
        .from('meetings_state')
        .update({
          current_section: sectionIndex,
          section_start_time: now,
          section_accumulated_times: updatedAccumulatedTimes
        })
        .eq('id', meetingId);

      if (error) {
        logger.error('❌ Error changing section:', error);
        throw error;
      }

      // Patch the accurate accumulated times into local state once the DB
      // confirms. currentSection / sectionStartTime are already up-to-date
      // from the optimistic update above.
      setTimerState(prevState => ({
        ...prevState,
        sectionAccumulatedTimes: updatedAccumulatedTimes,
      }));

      logger.log('✅ Successfully changed to section', sectionIndex, 'and saved accumulated times');
    } catch (error) {
      logger.error('❌ NewMeetingTimerContext: Error changing section, rolling back:', error);

      // Rollback the optimistic local update.
      setTimerState(prevState => ({
        ...prevState,
        currentSection: rollbackSection,
        sectionStartTime: rollbackSectionStartTime,
      }));

      // Broadcast the rollback so other participants who applied our
      // optimistic broadcast also revert. Only broadcast if we have a
      // valid previous start time (otherwise postgres_changes will heal it).
      if (sectionBroadcastRef.current && rollbackSectionStartTime !== null) {
        logger.log('🔁 NewMeetingTimerContext: Broadcasting rollback to section', rollbackSection);
        sectionBroadcastRef.current(rollbackSection, rollbackSectionStartTime);
      }
    }
  }, [meetingId, canControlTimer]);

  // Apply remote section change from broadcast (for participants receiving scriber's section changes)
  const applyRemoteSectionChange = useCallback((sectionIndex: number, sectionStartTime: number) => {
    logger.log('📡 NewMeetingTimerContext: Applying remote section change', { sectionIndex, sectionStartTime });
    setTimerState(prevState => ({
      ...prevState,
      currentSection: sectionIndex,
      sectionStartTime: sectionStartTime,
    }));
  }, []);

  const contextValue: NewMeetingTimerContextType = {
    isRunning,
    meetingId,
    currentRole,
    timerState,
    calculations,
    recentlyEndedMeeting,
    canControlTimer,
    pauseTimer,
    resumeTimer,
    scriberId,
    currentUserId,
    isOvertime,
    takeOverAsScriber,
    updateScriiberHeartbeat,
    startMeeting,
    joinExistingMeeting,
    endMeeting,
    leaveMeeting,
    pauseMeeting,
    resumeMeeting,
    changeSection,
    setSectionBroadcast,
    applyRemoteSectionChange,
    setScriberBroadcast,
    applyRemoteScriberChange,
    setMeetingStartedBroadcast,
    triggerAutoCreateIssues,
    formatDuration,
  };

  return (
    <NewMeetingTimerContext.Provider value={contextValue}>
      {children}
    </NewMeetingTimerContext.Provider>
  );
};
