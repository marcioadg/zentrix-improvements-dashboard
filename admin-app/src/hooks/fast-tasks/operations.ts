import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { FastTask, TeamInfo } from './types';
import { transformDatabaseTask } from './utils';
import { avatarCache } from './avatarCache';
import { sendTaskAssignedWebhook, getUserProfileForWebhook } from '@/services/taskAssignmentWebhook';
import { getMeetingCycleBoundaryISO } from '@/utils/meetingCycleUtils';

// PHASE 2: Optimized avatar enrichment with caching
const enrichTasksWithAvatars = async (tasks: FastTask[]) => {
  // Get unique user IDs for both assigned users and task owners
  const assignedUserIds = tasks
    .flatMap(task => task.assignedTo || [])
    .filter((id): id is string => Boolean(id));
  
  // Get owner user IDs for ALL tasks (both personal and team)
  const ownerUserIds = tasks
    .map(task => task.userId)
    .filter((id): id is string => Boolean(id));
  
  const allUserIds = [...new Set([...assignedUserIds, ...ownerUserIds])];
  
  if (allUserIds.length === 0) return;
  
  try {
    // Check cache first
    const cachedProfiles = avatarCache.getMany(allUserIds);
    const cachedUserIds = new Set(cachedProfiles.keys());
    const missingUserIds = allUserIds.filter(id => !cachedUserIds.has(id));
    
    // Only fetch missing profiles
    if (missingUserIds.length > 0) {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, avatar_url, full_name')
        .in('id', missingUserIds);
      
      if (error) {
        logger.warn('⚠️ Error fetching avatar URLs:', error);
      } else if (profiles) {
        // Cache the newly fetched profiles
        avatarCache.setMany(profiles);
        
        // Add to cached profiles map
        profiles.forEach(profile => {
          cachedProfiles.set(profile.id, {
            avatarUrl: profile.avatar_url,
            fullName: profile.full_name,
            timestamp: Date.now()
          });
        });
      }
    }
    
    // Apply avatars from cache (includes both cached and newly fetched)
    tasks.forEach(task => {
      // Set assigned user avatar (primary assignee for team tasks)
      const primaryAssignee = task.assignedTo?.[0];
      if (primaryAssignee) {
        const cached = cachedProfiles.get(primaryAssignee);
        if (cached?.avatarUrl) {
          task.assignedToAvatarUrl = cached.avatarUrl;
        }
      }
      
      // Set owner avatar for ALL tasks (both personal and team)
      const ownerCached = cachedProfiles.get(task.userId);
      if (ownerCached?.avatarUrl) {
        task.ownerAvatarUrl = ownerCached.avatarUrl;
      }
    });
    
    logger.info('enrichTasksWithAvatars: Applied avatars', {
      cached: cachedUserIds.size,
      fetched: missingUserIds.length,
      total: allUserIds.length
    });
  } catch (err) {
    logger.warn('⚠️ Error enriching tasks with avatars:', err);
  }
};

export const loadTeamInfo = async (userId: string): Promise<TeamInfo[]> => {
  if (!userId) {
    logger.debug('loadTeamInfo: No userId provided');
    return [];
  }
  
  try {
    logger.debug('loadTeamInfo: Loading team information for user:', userId);
    
    // Enhanced query to get teams with proper joins and company context
    const { data: teamData, error } = await supabase
      .from('team_members')
      .select(`
        team_id,
        teams:team_id!inner (
          id,
          name,
          company_id,
          companies:company_id (
            id,
            name
          )
        )
      `)
      .eq('user_id', userId);

    if (error) {
      logger.error('❌ loadTeamInfo: Database error:', error);
      throw error;
    }
    
    if (!teamData || teamData.length === 0) {
      logger.debug('loadTeamInfo: No team memberships found for user');
      return [];
    }

    logger.debug('loadTeamInfo: Raw team data received, processing', teamData.length, 'memberships');

    // Transform the data into TeamInfo format - properly access nested team data
    const teamInfo: TeamInfo[] = teamData
      .filter(membership => membership.teams) // Ensure team data exists
      .map(membership => {
        const team = membership.teams as any; // Type assertion to access nested properties
        return {
          id: team.id,
          company_id: team.company_id,
          name: team.name
        };
      });
    
    logger.debug('loadTeamInfo: Successfully loaded team info:', {
      count: teamInfo.length,
      teams: teamInfo.map(t => ({ 
        id: t.id, 
        name: t.name, 
        company_id: t.company_id 
      }))
    });
    
    return teamInfo;
  } catch (err) {
    logger.error('❌ loadTeamInfo: Error loading team info:', err);
    return [];
  }
};

export const loadAllTasks = async (
  userId: string, 
  showArchived: boolean = false,
  meetingOptimization?: { teamId: string }
): Promise<FastTask[]> => {
  if (!userId) return [];

  try {
    let allTasks: FastTask[] = [];

    // PHASE 3: Parallel query execution for independent queries
    // Personal tasks and team memberships are independent, fetch in parallel
    const queries = [];
    
    // OPTIMIZATION: Skip personal tasks during meetings (only team tasks needed)
    if (!meetingOptimization) {
      const personalQuery = supabase
        .from('fast_tasks')
        .select('id, title, description, status, due_date, created_at, updated_at, task_type, team_id, team_name, assigned_to, user_id, is_archived, archived_at, company_id, order_position, completed_at')
        .eq('user_id', userId)
        .eq('task_type', 'personal')
        .eq('is_deleted', false)
        .eq('is_archived', showArchived)
        .order('order_position', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });
      
      queries.push(personalQuery);
    } else {
      queries.push(Promise.resolve({ data: null, error: null }));
    }

    // Always need team memberships for team tasks
    const membershipQuery = supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId);
    
    queries.push(membershipQuery);

    // Execute personal and membership queries in parallel
    const [personalResult, membershipResult] = await Promise.all(queries);

    // Handle personal tasks result
    if (personalResult.error) throw personalResult.error;
    if (personalResult.data) {
      allTasks = personalResult.data.map(transformDatabaseTask);
    }

    // Handle membership result
    if (membershipResult.error) {
      logger.warn('Error loading team memberships:', membershipResult.error);
    }

    const userTeamIds = membershipResult.data?.map(tm => tm.team_id) || [];
    
    logger.debug('loadAllTasks: User belongs to teams:', userTeamIds);

    // OPTIMIZATION: During meetings, only query the specific team's tasks
    const targetTeamIds = meetingOptimization?.teamId 
      ? [meetingOptimization.teamId].filter(id => userTeamIds.includes(id)) // Ensure user has access
      : userTeamIds;

    // Load team tasks (depends on membership result, so must be sequential)
    let teamTasks = [];
    if (targetTeamIds.length > 0) {
      let teamQuery = supabase
        .from('fast_tasks')
        .select(`
          id, title, description, status, due_date, created_at, updated_at, task_type, 
          team_id, assigned_to, user_id, is_archived, archived_at, company_id, order_position, completed_at,
          teams:team_id(name)
        `)
        .eq('task_type', 'team')
        .in('team_id', targetTeamIds)
        .eq('is_deleted', false)
        .eq('is_archived', showArchived)
        .order('order_position', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      // MEETING CYCLE FILTER: During meetings, only show completed tasks from current/previous cycle
      // Pending/in-progress tasks are always shown regardless of age
      if (meetingOptimization) {
        const cycleBoundary = getMeetingCycleBoundaryISO();
        // Show: all non-done tasks OR done tasks created within the cycle window
        teamQuery = teamQuery.or(`status.neq.done,and(status.eq.done,created_at.gte.${cycleBoundary})`);
        logger.info('loadAllTasks: Meeting cycle filter applied', { cycleBoundary });
      }

      const { data: teamTasksData, error: teamError } = await teamQuery;

      if (teamError && process.env.NODE_ENV === 'development') {
        logger.warn('⚠️ Error loading team tasks:', teamError);
      } else {
        teamTasks = teamTasksData || [];
      }
      
      logger.info('loadAllTasks: Query optimization applied', {
        parallelQueries: !meetingOptimization ? 2 : 1,
        meetingOptimization: !!meetingOptimization,
        targetTeamIds,
        loadedCount: teamTasks.length
      });
    }

    // Transform team tasks and combine
    const teamTasksTransformed = teamTasks.map(transformDatabaseTask);
    allTasks = [...allTasks, ...teamTasksTransformed];
    
    // Fetch avatar URLs for assigned users only if we have tasks to process
    if (allTasks.length > 0) {
      await enrichTasksWithAvatars(allTasks);
    }
    
    logger.info('loadAllTasks: Tasks loaded successfully', {
      personalCount: meetingOptimization ? 0 : allTasks.filter(t => t.taskType === 'personal').length,
      teamCount: teamTasksTransformed.length,
      totalCount: allTasks.length,
      showArchived
    });
    
    return allTasks;
  } catch (err) {
    logger.error('❌ loadAllTasks: Error loading tasks:', err);
    throw err;
  }
};

export const validateTeamAccess = async (teamId: string, userId: string, currentCompanyId?: string): Promise<boolean> => {
  if (!userId || !currentCompanyId) return false;
  
  try {
    // 1) Super admin bypass
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (userProfile?.role === 'super_admin') {
      logger.info('Super admin access granted for team:', teamId);
      return true;
    }

    // 2) Validate team belongs to the current company
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .select('company_id')
      .eq('id', teamId)
      .maybeSingle();

    if (teamError || !teamData) {
      logger.warn('⚠️ Team not found or error loading team:', { teamId, teamError });
      return false;
    }

    if (teamData.company_id !== currentCompanyId) {
      logger.warn('⚠️ Cross-company team access denied:', {
        teamId,
        teamCompanyId: teamData.company_id,
        userCompanyId: currentCompanyId
      });
      return false;
    }

    // 3) Confirm the user is a member of the team
    const { data: membership, error: membershipError } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .maybeSingle();

    if (membershipError) {
      logger.warn('⚠️ Error checking team membership:', membershipError);
      return false;
    }

    const hasMembership = !!membership;
    if (!hasMembership) {
      logger.warn('⚠️ User is not a member of the team:', { teamId, userId });
    }

    return hasMembership;
  } catch (err) {
    logger.error('❌ Error validating team access:', err);
    return false;
  }
};

export const createTask = async (
  userId: string,
  title: string,
  description: string = '',
  dueDate?: string,
  taskType: 'personal' | 'team' = 'personal',
  teamId?: string,
  teamName?: string,
  assignedTo?: string | string[], // Now accepts both single string and array
  status: 'todo' | 'in-progress' | 'done' = 'todo',
  companyId?: string, // Optional company ID for webhook
  splitPerMember: boolean = false, // When true, creates individual tasks for each assignee
) => {
  // Ensure date is in correct YYYY-MM-DD format
  let formattedDueDate = dueDate;
  if (dueDate) {
    // If the date contains slashes, it might be in MM/DD/YYYY format
    if (dueDate.includes('/')) {
      // Parse MM/DD/YYYY and convert to YYYY-MM-DD
      const [month, day, year] = dueDate.split('/');
      formattedDueDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  logger.log('🔧 createTask: Creating task with date/status:', {
    title,
    originalDueDate: dueDate,
    formattedDueDate,
    status,
    splitPerMember,
    dueDateType: typeof dueDate,
    todayFormatted: new Date().toISOString().split('T')[0],
    currentTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });
  // For team tasks, ensure we have the team name
  let finalTeamName = teamName;
  if (taskType === 'team' && teamId && !finalTeamName) {
    logger.log('🔍 createTask: Fetching team name for team:', teamId);
    try {
      const { data: teamData, error } = await supabase
        .from('teams')
        .select('name')
        .eq('id', teamId)
        .single();

      if (error) {
        logger.warn('⚠️ Could not fetch team name:', error);
      } else {
        finalTeamName = teamData.name;
        logger.log('✅ createTask: Got team name:', finalTeamName);
      }
    } catch (err) {
      logger.warn('⚠️ Error fetching team name:', err);
    }
  }

  // Normalize assigned_to to array
  const normalizedAssignedTo = taskType === 'team' ?
    (assignedTo ?
      (Array.isArray(assignedTo) ? assignedTo : [assignedTo]) :
      [userId]
    ) :
    (assignedTo ?
      (Array.isArray(assignedTo) ? assignedTo : [assignedTo]) :
      null
    );

  // Split per member: create individual tasks linked by group_id
  if (splitPerMember && normalizedAssignedTo && normalizedAssignedTo.length > 1) {
    const groupId = crypto.randomUUID();
    const taskRows = normalizedAssignedTo.map((assigneeId: string) => ({
      user_id: userId,
      title: title.trim(),
      description: description.trim(),
      status: status,
      due_date: formattedDueDate || null,
      task_type: taskType,
      team_id: teamId || null,
      team_name: finalTeamName || null,
      assigned_to: [assigneeId],
      company_id: taskType === 'personal' && companyId ? companyId : null,
      group_id: groupId,
    }));

    const { data, error } = await supabase
      .from('fast_tasks')
      .insert(taskRows)
      .select('*, company_id');

    if (error) {
      if (error.message.includes('cannot create team tasks in companies')) {
        throw new Error('You cannot create team tasks in companies you do not have access to');
      }
      throw error;
    }

    // Send webhooks for each assignee (non-blocking)
    const taskCompanyId = companyId || data[0]?.company_id;
    if (taskCompanyId) {
      getUserProfileForWebhook(userId).then((creatorProfile) => {
        if (creatorProfile) {
          data.forEach((task: any) => {
            const assigneeId = task.assigned_to?.[0];
            if (assigneeId && assigneeId !== userId) {
              sendTaskAssignedWebhook({
                taskId: task.id,
                taskTitle: title.trim(),
                taskDescription: description.trim(),
                assigneeUserId: assigneeId,
                assignedByUserId: userId,
                assignedByName: creatorProfile.fullName,
                assignedByEmail: creatorProfile.email,
                dueDate: formattedDueDate || undefined,
                teamName: finalTeamName || undefined,
                companyId: taskCompanyId,
                status: status,
              });
            }
          });
        }
      }).catch((err) => {
        logger.warn('⚠️ Failed to send task assignment webhook:', err);
      });
    }

    // Track events for each created task (non-blocking)
    import('@/lib/statsigAnalytics').then(({ trackTaskCreatedV2 }) => {
      data.forEach((task: any) => {
        trackTaskCreatedV2({
          user_id: userId,
          company_id: taskCompanyId,
          task_id: task.id,
          task_text: title.trim().substring(0, 100),
          assignee_id: task.assigned_to?.[0] || null,
          source: 'manual',
          due_date: formattedDueDate || undefined,
        });
      });
    }).catch((e) => {
      logger.warn('Failed to track task created event:', e);
    });

    // Return the first created task (caller's own copy if they're an assignee)
    const callerTask = data.find((t: any) => t.assigned_to?.includes(userId)) || data[0];
    return transformDatabaseTask(callerTask);
  }

  // Default: create a single shared task (existing behavior)
  const { data, error } = await supabase
    .from('fast_tasks')
    .insert({
      user_id: userId,
      title: title.trim(),
      description: description.trim(),
      status: status,
      due_date: formattedDueDate || null,
      task_type: taskType,
      team_id: teamId || null,
      team_name: finalTeamName || null,
      assigned_to: normalizedAssignedTo,
      // Explicitly set company_id for personal tasks to avoid trigger issues
      company_id: taskType === 'personal' && companyId ? companyId : null,
    })
    .select('*, company_id')
    .single();

  if (error) {
    // Check for validation trigger error
    if (error.message.includes('cannot create team tasks in companies')) {
      throw new Error('You cannot create team tasks in companies you do not have access to');
    }
    throw error;
  }

  // Send webhook for task assignment (non-blocking)
  // Only send for assignees that are not the creator
  const taskCompanyId = companyId || data.company_id;
  if (taskCompanyId && normalizedAssignedTo && normalizedAssignedTo.length > 0) {
    // Get creator's profile for the webhook
    getUserProfileForWebhook(userId).then((creatorProfile) => {
      if (creatorProfile) {
        // Send webhook for each assignee (except the creator)
        normalizedAssignedTo
          .filter((assigneeId: string) => assigneeId !== userId)
          .forEach((assigneeId: string) => {
            sendTaskAssignedWebhook({
              taskId: data.id,
              taskTitle: title.trim(),
              taskDescription: description.trim(),
              assigneeUserId: assigneeId,
              assignedByUserId: userId,
              assignedByName: creatorProfile.fullName,
              assignedByEmail: creatorProfile.email,
              dueDate: formattedDueDate || undefined,
              teamName: finalTeamName || undefined,
              companyId: taskCompanyId,
              status: status,
            });
        });
      }
    }).catch((err) => {
      logger.warn('⚠️ Failed to send task assignment webhook:', err);
    });
  }

  // Track task created event (non-blocking)
  import('@/lib/statsigAnalytics').then(({ trackTaskCreatedV2 }) => {
    trackTaskCreatedV2({
      user_id: userId,
      company_id: companyId || data.company_id,
      task_id: data.id,
      task_text: title.trim().substring(0, 100), // Limit length
      assignee_id: normalizedAssignedTo?.[0] || null,
      source: 'manual',
      due_date: formattedDueDate || undefined,
    });
  }).catch((e) => {
    logger.warn('Failed to track task created event:', e);
  });

  return transformDatabaseTask(data);
};

export const updateTask = async (id: string, updates: Partial<FastTask>) => {
  logger.debug('updateTask: Starting update', { id, updates });
  
  // Fetch existing task to compare assignees for webhook
  let existingTask: any = null;
  if (updates.assignedTo !== undefined) {
    const { data: existing } = await supabase
      .from('fast_tasks')
      .select('assigned_to, title, description, due_date, team_name, company_id, user_id')
      .eq('id', id)
      .single();
    existingTask = existing;
  }
  
  const dbUpdates: any = {};
  
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.dueDate !== undefined) {
    // Ensure date is in correct YYYY-MM-DD format
    let formattedDueDate = updates.dueDate;
    if (updates.dueDate && updates.dueDate.includes('/')) {
      // Parse MM/DD/YYYY and convert to YYYY-MM-DD
      const [month, day, year] = updates.dueDate.split('/');
      formattedDueDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    dbUpdates.due_date = formattedDueDate;
    logger.log('🔧 updateTask: Due date update:', {
      originalDate: updates.dueDate,
      formattedDate: formattedDueDate,
      dbFormat: dbUpdates.due_date,
      dateType: typeof updates.dueDate,
      asDateObject: formattedDueDate ? new Date(formattedDueDate + 'T12:00:00') : null
    });
  }
  if (updates.taskType !== undefined) dbUpdates.task_type = updates.taskType;
  if (updates.teamId !== undefined) {
    dbUpdates.team_id = updates.teamId;
    
    // If teamId is being updated but teamName is not provided, fetch the team name
    if (updates.teamName === undefined && updates.teamId) {
      logger.debug('updateTask: Fetching team name for teamId:', updates.teamId);
      try {
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select('name')
          .eq('id', updates.teamId)
          .single();
        
        if (!teamError && teamData) {
          dbUpdates.team_name = teamData.name;
          logger.debug('updateTask: Auto-resolved team name:', teamData.name);
        }
      } catch (error) {
        logger.warn('⚠️ updateTask: Failed to fetch team name:', error);
      }
    }
  }
  if (updates.teamName !== undefined) dbUpdates.team_name = updates.teamName;
  if (updates.userId !== undefined) dbUpdates.user_id = updates.userId;
  if (updates.orderPosition !== undefined) dbUpdates.order_position = updates.orderPosition;
  
  // Handle assignedTo as array of UUIDs
  let newAssignedTo: string[] | null = null;
  if (updates.assignedTo !== undefined) {
    // Ensure we're passing array of UUID strings
    if (Array.isArray(updates.assignedTo)) {
      dbUpdates.assigned_to = updates.assignedTo;
      newAssignedTo = updates.assignedTo;
    } else if (typeof updates.assignedTo === 'string') {
      dbUpdates.assigned_to = [updates.assignedTo];
      newAssignedTo = [updates.assignedTo];
    } else if (updates.assignedTo === null || updates.assignedTo === undefined) {
      dbUpdates.assigned_to = [];
      newAssignedTo = [];
    } else {
      logger.warn('⚠️ updateTask: Invalid assignedTo type, expected string[] or string or null:', updates.assignedTo);
      dbUpdates.assigned_to = [];
      newAssignedTo = [];
    }
  }
  
  

  logger.debug('updateTask: Database updates prepared', dbUpdates);

  try {
    const { error } = await supabase
      .from('fast_tasks')
      .update(dbUpdates)
      .eq('id', id);

    if (error) {
      logger.error('❌ updateTask: Database error:', error);
      throw error;
    }
    
    logger.info('updateTask: Task updated successfully');

    // Track task updated event (non-blocking)
    try {
      const fieldsChanged = Object.keys(dbUpdates);
      
      // Check if status changed to 'done' for task_completed event
      if (updates.status === 'done') {
        // Fetch the original task to calculate days to complete
        const { data: originalTask } = await supabase
          .from('fast_tasks')
          .select('created_at, due_date, assigned_to, user_id, company_id')
          .eq('id', id)
          .single();
        
        if (originalTask) {
          const createdAt = new Date(originalTask.created_at);
          const completedAt = new Date();
          const daysToComplete = Math.ceil((completedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
          
          // Check if completed on time (before or on due date)
          let completedOnTime = true;
          if (originalTask.due_date) {
            const dueDate = new Date(originalTask.due_date);
            dueDate.setHours(23, 59, 59, 999); // End of day
            completedOnTime = completedAt <= dueDate;
          }
          
          import('@/lib/statsigAnalytics').then(({ trackTaskCompletedV2 }) => {
            trackTaskCompletedV2({
              user_id: originalTask.user_id,
              company_id: originalTask.company_id,
              task_id: id,
              completed_on_time: completedOnTime,
              days_to_complete: daysToComplete,
              assignee_id: originalTask.assigned_to?.[0] || null,
            });
          }).catch((e) => {
            logger.warn('Failed to track task completed event:', e);
          });
        }
      } else {
        // Regular update (not completion)
        import('@/lib/statsigAnalytics').then(({ trackTaskUpdatedV2 }) => {
          trackTaskUpdatedV2({
            user_id: existingTask?.user_id,
            company_id: existingTask?.company_id,
            task_id: id,
            fields_changed: fieldsChanged,
            assignee_id: newAssignedTo?.[0] || existingTask?.assigned_to?.[0] || null,
          });
        }).catch((e) => {
          logger.warn('Failed to track task updated event:', e);
        });
      }
    } catch (e) {
      // Non-blocking
    }

    // Send webhook for newly assigned users (non-blocking)
    if (existingTask && newAssignedTo && existingTask.company_id) {
      const oldAssignees = existingTask.assigned_to || [];
      const newAssignees = newAssignedTo.filter((assignee: string) => !oldAssignees.includes(assignee));
      
      if (newAssignees.length > 0) {
        // Get current user's profile for webhook
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          getUserProfileForWebhook(user.id).then((assignerProfile) => {
            if (assignerProfile) {
              newAssignees.forEach((assigneeId: string) => {
                sendTaskAssignedWebhook({
                  taskId: id,
                  taskTitle: updates.title || existingTask.title || 'Untitled Task',
                  taskDescription: updates.description || existingTask.description || '',
                  assigneeUserId: assigneeId,
                  assignedByUserId: user.id,
                  assignedByName: assignerProfile.fullName,
                  assignedByEmail: assignerProfile.email,
                  dueDate: dbUpdates.due_date || existingTask.due_date || undefined,
                  teamName: dbUpdates.team_name || existingTask.team_name || undefined,
                  companyId: existingTask.company_id,
                });
              });
            }
          }).catch((err) => {
            logger.warn('⚠️ Failed to send task reassignment webhook:', err);
          });
        }
      }
    }
  } catch (err) {
    logger.error('❌ updateTask: Update failed:', err);
    throw err;
  }
};

export const archiveTask = async (id: string) => {
  // Fetch task before archiving for tracking
  const { data: taskToArchive } = await supabase
    .from('fast_tasks')
    .select('status, user_id, company_id')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('fast_tasks')
    .update({ 
      is_archived: true,
      archived_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) throw error;

  // Track task archived event (non-blocking)
  if (taskToArchive) {
    import('@/lib/statsigAnalytics').then(({ trackTaskArchivedV2 }) => {
      trackTaskArchivedV2({
        user_id: taskToArchive.user_id,
        company_id: taskToArchive.company_id,
        task_id: id,
        was_completed: taskToArchive.status === 'done',
      });
    }).catch((e) => {
      logger.warn('Failed to track task archived event:', e);
    });
  }
};

export const restoreTask = async (id: string) => {
  const { error } = await supabase
    .from('fast_tasks')
    .update({ 
      is_archived: false,
      archived_at: null
    })
    .eq('id', id);

  if (error) throw error;
};

export const deleteTask = async (id: string) => {
  // Fetch task before deletion for tracking
  const { data: taskToDelete } = await supabase
    .from('fast_tasks')
    .select('status, user_id, company_id')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('fast_tasks')
    .update({ 
      is_deleted: true,
      deleted_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) throw error;

  // Track task archived event (non-blocking)
  if (taskToDelete) {
    import('@/lib/statsigAnalytics').then(({ trackTaskArchivedV2 }) => {
      trackTaskArchivedV2({
        user_id: taskToDelete.user_id,
        company_id: taskToDelete.company_id,
        task_id: id,
        was_completed: taskToDelete.status === 'done',
      });
    }).catch((e) => {
      logger.warn('Failed to track task deleted event:', e);
    });
  }
};

// STEP 2: Implement actual permission-based logic
export const clearCompletedTasksWithPermissions = async (
  userId: string, 
  options?: {
    onlyMyTasks?: boolean;
    permissionLevel?: string;
    teamIds?: string[];
  }
) => {
  logger.log('🔍 clearCompletedTasksWithPermissions: Starting with:', { userId, options });
  
  let totalArchived = 0;
  const archivedTaskIds: string[] = [];
  
  // Determine user permissions
  const isManager = options?.permissionLevel && ['manager', 'director', 'admin', 'owner', 'super_admin'].includes(options.permissionLevel);
  const onlyMyTasks = options?.onlyMyTasks === true;
  
  logger.log('🔍 Permission analysis:', { isManager, onlyMyTasks, permissionLevel: options?.permissionLevel });
  
  // STEP 2: Always archive personal tasks the user owns
  const { data: personalData, error: personalError } = await supabase
    .from('fast_tasks')
    .update({ 
      is_archived: true,
      archived_at: new Date().toISOString()
    })
    .eq('status', 'done')
    .eq('is_archived', false)
    .eq('task_type', 'personal')
    .eq('user_id', userId)
    .select('id, title, task_type');

  if (personalError) {
    logger.error('❌ clearCompletedTasksWithPermissions: Error archiving personal tasks:', personalError);
    throw personalError;
  }

  logger.log('📋 Personal tasks archived:', personalData?.length || 0, personalData);

  if (personalData) {
    totalArchived += personalData.length;
    archivedTaskIds.push(...personalData.map(task => task.id));
  }

  // STEP 2: Handle team tasks based on permissions
  let teamFilter = supabase
    .from('fast_tasks')
    .update({ 
      is_archived: true,
      archived_at: new Date().toISOString()
    })
    .eq('status', 'done')
    .eq('is_archived', false)
    .eq('task_type', 'team');

  if (!isManager || onlyMyTasks) {
    // Members OR managers with "only my tasks" toggle: only assigned tasks
    logger.log('🔒 Archiving only assigned team tasks');
    teamFilter = teamFilter.contains('assigned_to', [userId]);
  } else {
    // Managers without "only my tasks": all team tasks in their teams
    logger.log('🔓 Archiving all completed team tasks (manager permissions)');
    // Note: RLS will still enforce that they can only archive tasks from teams they belong to
  }

  const { data: teamData, error: teamError } = await teamFilter.select('id, title, task_type');

  if (teamError) {
    logger.error('❌ clearCompletedTasksWithPermissions: Error archiving team tasks:', teamError);
    throw teamError;
  }

  logger.log('👥 Team tasks archived:', teamData?.length || 0, teamData);

  if (teamData) {
    totalArchived += teamData.length;
    archivedTaskIds.push(...teamData.map(task => task.id));
  }

  logger.log('✅ clearCompletedTasksWithPermissions: Total archived:', totalArchived, 'task IDs:', archivedTaskIds);
  return { count: totalArchived, taskIds: archivedTaskIds };
};

export const clearCompletedTasks = async (userId: string) => {
  // Archive completed tasks instead of deleting them
  // Split into two operations to avoid PostgREST .or() parsing issues
  
  let totalArchived = 0;
  const archivedTaskIds: string[] = [];
  
  logger.log('🔍 clearCompletedTasks: Starting with userId:', userId);
  
  // Archive personal tasks owned by the user
  const { data: personalData, error: personalError } = await supabase
    .from('fast_tasks')
    .update({ 
      is_archived: true,
      archived_at: new Date().toISOString()
    })
    .eq('status', 'done')
    .eq('is_archived', false)
    .eq('task_type', 'personal')
    .eq('user_id', userId)
    .select('id, title, task_type');

  if (personalError) {
    logger.error('❌ clearCompletedTasks: Error archiving personal tasks:', personalError);
    throw personalError;
  }

  logger.log('📋 Personal tasks archived:', personalData?.length || 0, personalData);

  if (personalData) {
    totalArchived += personalData.length;
    archivedTaskIds.push(...personalData.map(task => task.id));
  }

  // Archive team tasks assigned to the user
  const { data: teamData, error: teamError } = await supabase
    .from('fast_tasks')
    .update({ 
      is_archived: true,
      archived_at: new Date().toISOString()
    })
    .eq('status', 'done')
    .eq('is_archived', false)
    .eq('task_type', 'team')
    .contains('assigned_to', [userId])
    .select('id, title, task_type');

  if (teamError) {
    logger.error('❌ clearCompletedTasks: Error archiving team tasks:', teamError);
    throw teamError;
  }

  logger.log('👥 Team tasks archived:', teamData?.length || 0, teamData);

  if (teamData) {
    totalArchived += teamData.length;
    archivedTaskIds.push(...teamData.map(task => task.id));
  }

  logger.log('✅ clearCompletedTasks: Total archived:', totalArchived, 'task IDs:', archivedTaskIds);
  return { count: totalArchived, taskIds: archivedTaskIds };
};

export const undoArchiveTasks = async (taskIds: string[]) => {
  const { data, error } = await supabase
    .from('fast_tasks')
    .update({ 
      is_archived: false,
      archived_at: null
    })
    .in('id', taskIds)
    .select('id, title, task_type, status');

  if (error) {
    logger.error('❌ undoArchiveTasks: Error unarchiving tasks:', error);
    throw error;
  }

  logger.log('✅ undoArchiveTasks: Unarchived', data?.length || 0, 'tasks');
  return data || [];
};
