/**
 * Centralized message copy - User-friendly notifications
 * Principles:
 * - Outcome first (not "Successfully saved goal" → "Goal saved")
 * - Active voice
 * - Positive framing
 * - No technical jargon
 * - Max 5 words for titles
 */

export const SUCCESS_MESSAGES = {
  // Goal Messages
  GOAL_CREATED: {
    title: 'Goal created',
    description: 'Visible to your team now',
  },
  GOAL_UPDATED: {
    title: 'Goal updated',
    description: 'Changes saved',
  },
  GOAL_DELETED: {
    title: 'Goal deleted',
    description: 'Removed from all views',
  },
  GOAL_ARCHIVED: {
    title: 'Goal archived',
    description: 'Hidden from active goals',
  },
  
  // Task Messages
  TASK_CREATED: {
    title: 'Task created',
    description: 'Added to your list',
  },
  TASK_COMPLETED: {
    title: 'Task completed',
    description: 'Marked as done',
  },
  TASK_UPDATED: {
    title: 'Task updated',
    description: 'Changes saved',
  },
  TASK_DELETED: {
    title: 'Task deleted',
    description: 'Removed from your list',
  },
  
  // Clarity Break Messages
  BREAK_SAVED: {
    title: 'Break saved',
    description: 'Added to your history',
  },
  BREAK_EXITED: {
    title: 'Break exited',
    description: 'Session not saved',
  },
  
  // Team Messages
  MEMBER_ADDED: {
    title: 'Member added',
    description: 'Invite sent',
  },
  MEMBER_REMOVED: {
    title: 'Member removed',
    description: 'Access revoked',
  },
  TEAM_CREATED: {
    title: 'Team created',
    description: 'Ready to add members',
  },
  
  // Meeting Messages
  MEETING_CLOSED: {
    title: 'Meeting closed',
    description: 'Results saved',
  },
  
  // Metric Messages
  METRIC_CREATED: {
    title: 'Metric created',
    description: 'Tracking started',
  },
  METRIC_UPDATED: {
    title: 'Metric updated',
    description: 'New value recorded',
  },
  
  // Issue Messages
  ISSUE_CREATED: {
    title: 'Issue added',
    description: 'Team can now vote',
  },
  ISSUE_RESOLVED: {
    title: 'Issue resolved',
    description: 'Marked as complete',
  },
  
  // Generic
  CHANGES_SAVED: {
    title: 'Changes saved',
    description: 'Updates applied',
  },
} as const;

export const ERROR_MESSAGES = {
  // Goal Errors
  CANT_LOAD_GOALS: {
    title: "Can't load goals",
    description: 'Try refreshing',
  },
  CANT_CREATE_GOAL: {
    title: "Can't create goal",
    description: 'Check connection and retry',
  },
  CANT_UPDATE_GOAL: {
    title: "Can't update goal",
    description: 'Try saving again',
  },
  CANT_DELETE_GOAL: {
    title: "Can't delete goal",
    description: 'Try again',
  },
  
  // Task Errors
  CANT_CREATE_TASK: {
    title: "Can't create task",
    description: 'Check connection and retry',
  },
  CANT_UPDATE_TASK: {
    title: "Can't update task",
    description: 'Try saving again',
  },
  CANT_DELETE_TASK: {
    title: "Can't delete task",
    description: 'Try again',
  },
  
  // Clarity Break Errors
  CANT_LOAD_BREAKS: {
    title: "Can't load breaks",
    description: 'Try refreshing',
  },
  CANT_START_BREAK: {
    title: "Can't start break",
    description: 'Try again',
  },
  CANT_SAVE_BREAK: {
    title: "Can't save break",
    description: 'Check connection and retry',
  },
  CANT_RESUME_BREAK: {
    title: "Can't resume break",
    description: 'Try again',
  },
  CANT_ABANDON_BREAK: {
    title: "Can't abandon break",
    description: 'Try again',
  },
  
  // Team Errors
  CANT_ADD_MEMBER: {
    title: "Can't add member",
    description: 'Check email and retry',
  },
  CANT_REMOVE_MEMBER: {
    title: "Can't remove member",
    description: 'Try again',
  },
  CANT_UPDATE_ROLE: {
    title: "Can't update role",
    description: 'Try again',
  },
  
  // Meeting Errors
  CANT_CLOSE_MEETING: {
    title: "Can't close meeting",
    description: 'Try again',
  },
  
  // Metric Errors
  CANT_CREATE_METRIC: {
    title: "Can't create metric",
    description: 'Try again',
  },
  CANT_UPDATE_METRIC: {
    title: "Can't update metric",
    description: 'Try saving again',
  },
  
  // Issue Errors
  CANT_CREATE_ISSUE: {
    title: "Can't create issue",
    description: 'Try again',
  },
  CANT_UPDATE_ISSUE: {
    title: "Can't update issue",
    description: 'Try again',
  },
  
  // Generic Errors
  CANT_SAVE: {
    title: "Can't save",
    description: 'Check connection and retry',
  },
  CANT_LOAD: {
    title: "Can't load",
    description: 'Try refreshing',
  },
  CANT_DELETE: {
    title: "Can't delete",
    description: 'Try again',
  },
} as const;

export const LOADING_MESSAGES = {
  LOADING_GOALS: 'Loading goals...',
  LOADING_TASKS: 'Loading tasks...',
  LOADING_METRICS: 'Loading metrics...',
  LOADING_TEAMS: 'Loading teams...',
  LOADING_MEMBERS: 'Loading members...',
  LOADING_MEETINGS: 'Loading meetings...',
  LOADING_ISSUES: 'Loading issues...',
  PROCESSING: 'Processing...',
  SAVING: 'Saving...',
  DELETING: 'Deleting...',
  STILL_LOADING: 'Still loading...',
} as const;

export const CONFIRMATION_MESSAGES = {
  DELETE_GOAL: {
    title: 'Delete this goal?',
    description: "Can't be undone",
  },
  DELETE_TASK: {
    title: 'Delete this task?',
    description: "Can't be undone",
  },
  DELETE_TEAM: {
    title: 'Delete this team?',
    description: 'Members will lose access',
  },
  LEAVE_COMPANY: {
    title: 'Leave company?',
    description: "You'll lose all access",
  },
  ARCHIVE_GOAL: {
    title: 'Archive goal?',
    description: "It'll be hidden",
  },
  REMOVE_MEMBER: {
    title: 'Remove member?',
    description: 'Access will be revoked',
  },
} as const;

export const EMPTY_STATE_MESSAGES = {
  NO_GOALS: {
    title: 'No goals yet',
    description: 'Create one to start tracking',
  },
  NO_TASKS: {
    title: 'No tasks yet',
    description: 'Add one to get started',
  },
  NO_TEAMS: {
    title: 'No teams yet',
    description: 'Ask your admin for access',
  },
  NO_METRICS: {
    title: 'No metrics yet',
    description: 'Add one to track progress',
  },
  NO_ISSUES: {
    title: 'No issues yet',
    description: 'Create one when needed',
  },
  NO_MEETINGS: {
    title: 'No meetings yet',
    description: 'Schedule your first one',
  },
  NO_MEMBERS: {
    title: 'No members yet',
    description: 'Invite your team',
  },
} as const;
