/**
 * Consistent terminology across the app
 * Principles:
 * - Specific nouns over generic terms
 * - User's mental model (not developer terms)
 * - Consistent names for same concepts
 * - No synonyms for the same thing
 */

export const TERMINOLOGY = {
  // Entity Names (Consistent across app)
  GOAL: 'Goal',
  GOALS: 'Goals',
  TASK: 'Task',
  TASKS: 'Tasks',
  METRIC: 'Metric',
  METRICS: 'Metrics',
  TEAM: 'Team',
  TEAMS: 'Teams',
  MEMBER: 'Member',
  MEMBERS: 'Members',
  MEETING: 'Meeting',
  MEETINGS: 'Meetings',
  ISSUE: 'Issue',
  ISSUES: 'Issues',
  BREAK: 'Break',
  BREAKS: 'Breaks',
  
  // Status Terms (Never use vague terms)
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
  DELETED: 'Deleted',
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  ON_TRACK: 'On Track',
  AT_RISK: 'At Risk',
  OFF_TRACK: 'Off Track',
  
  // Time Terms (Be specific)
  TODAY: 'Today',
  THIS_WEEK: 'This Week',
  THIS_MONTH: 'This Month',
  LAST_7_DAYS: 'Last 7 Days',
  LAST_30_DAYS: 'Last 30 Days',
  OVERDUE: 'Overdue',
  DUE_SOON: 'Due Soon',
  
  // Action Terms (Consistent verbs)
  ACTION_CREATE: 'Create',
  ACTION_ADD: 'Add',
  ACTION_EDIT: 'Edit',
  ACTION_UPDATE: 'Update',
  ACTION_DELETE: 'Delete',
  ACTION_ARCHIVE: 'Archive',
  ACTION_RESTORE: 'Restore',
  ACTION_ASSIGN: 'Assign',
  ACTION_COMPLETE: 'Complete',
  ACTION_RESOLVE: 'Resolve',
  ACTION_CLOSE: 'Close',
  ACTION_OPEN: 'Open',
  ACTION_VIEW: 'View',
  ACTION_FILTER: 'Filter',
  ACTION_SORT: 'Sort',
  ACTION_SEARCH: 'Search',
  
  // People Terms (User mental model)
  OWNER: 'Owner',
  ADMIN: 'Admin',
  USER_MEMBER: 'Member',
  YOU: 'You',
  YOUR: 'Your',
  
  // Settings/Config Terms
  PREFERENCES: 'Preferences',
  TEAM_SETTINGS: 'Team Settings',
  ACCOUNT: 'Account',
  PROFILE: 'Profile',
  
  // Navigation Terms
  DASHBOARD: 'Dashboard',
  OVERVIEW: 'Overview',
  DETAILS: 'Details',
  HISTORY: 'History',
  ACTIVITY: 'Activity',
  
  // CRITICAL: Forbidden Terms (NEVER USE)
  // ❌ Rocks → ALWAYS use "Goals"
  // ❌ Scorecards → ALWAYS use "Metrics"
  // ❌ To-Dos/To Do → ALWAYS use "Tasks"
  // ❌ IDS → ALWAYS use "Issues"
  // ❌ EOS terminology → Use clear business terms
  
  // Avoid These (Replace with specific terms)
  // ❌ Item → Goal/Task/Metric
  // ❌ Thing → Specific entity
  // ❌ Data → Goals/Tasks/Metrics
  // ❌ Content → Process/Playbook/Strategy
  // ❌ Information → Details/Overview
  // ❌ User → Member/Admin/Owner
  // ❌ Recently → Today/This week
  // ❌ Soon → Specific time
  // ❌ Manage → Edit/Update/Configure
} as const;

// Helper functions for dynamic terminology
export const terminology = {
  /**
   * Get the proper term for an entity
   */
  entity: (type: string, count: number = 1) => {
    const terms: Record<string, { singular: string; plural: string }> = {
      goal: { singular: TERMINOLOGY.GOAL, plural: TERMINOLOGY.GOALS },
      task: { singular: TERMINOLOGY.TASK, plural: TERMINOLOGY.TASKS },
      metric: { singular: TERMINOLOGY.METRIC, plural: TERMINOLOGY.METRICS },
      team: { singular: TERMINOLOGY.TEAM, plural: TERMINOLOGY.TEAMS },
      member: { singular: TERMINOLOGY.MEMBER, plural: TERMINOLOGY.MEMBERS },
      meeting: { singular: TERMINOLOGY.MEETING, plural: TERMINOLOGY.MEETINGS },
      issue: { singular: TERMINOLOGY.ISSUE, plural: TERMINOLOGY.ISSUES },
      break: { singular: TERMINOLOGY.BREAK, plural: TERMINOLOGY.BREAKS },
    };
    
    const term = terms[type.toLowerCase()];
    return count === 1 ? term?.singular : term?.plural;
  },
  
  /**
   * Format "No X yet" messages
   */
  noEntityYet: (type: string) => {
    const plural = terminology.entity(type, 2);
    return `No ${plural?.toLowerCase()} yet`;
  },
  
  /**
   * Format "Loading X..." messages
   */
  loadingEntity: (type: string) => {
    const plural = terminology.entity(type, 2);
    return `Loading ${plural?.toLowerCase()}...`;
  },
};
