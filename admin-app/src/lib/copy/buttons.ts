/**
 * Centralized button copy - Single source of truth for all button labels
 * Principles:
 * - Verb + Noun (never just verb)
 * - Outcome, not process
 * - Max 3 words for primary actions
 * - No generic verbs without context
 */

export const BUTTON_COPY = {
  // Goal Actions
  SAVE_GOAL: 'Save Goal',
  UPDATE_GOAL: 'Update Goal',
  ADD_GOAL: 'Add Goal',
  NEW_GOAL: 'New Goal',
  DELETE_GOAL: 'Delete Goal',
  ARCHIVE_GOAL: 'Archive Goal',
  EDIT_GOAL: 'Edit Goal',
  KEEP_GOAL: 'Keep Goal',
  
  // Task Actions
  COMPLETE_TASK: 'Complete Task',
  ADD_TASK: 'Add Task',
  NEW_TASK: 'New Task',
  DELETE_TASK: 'Delete Task',
  ARCHIVE_TASK: 'Archive Task',
  EDIT_TASK: 'Edit Task',
  ASSIGN_TASK: 'Assign Task',
  UPDATE_STATUS: 'Update Status',
  
  // Meeting Actions
  CLOSE_MEETING: 'Close Meeting',
  START_MEETING: 'Start Meeting',
  SCHEDULE_MEETING: 'Schedule Meeting',
  
  // Metric Actions
  ADD_METRIC: 'Add Metric',
  UPDATE_METRIC: 'Update Metric',
  ENTER_VALUE: 'Enter Value',
  VIEW_METRICS: 'View Metrics',
  
  // Clarity Break Actions
  START_BREAK: 'Start Break',
  FINISH_BREAK: 'Finish Break',
  EXIT_BREAK: 'Exit Break',
  CONTINUE_BREAK: 'Continue Break',
  
  // Team Actions
  ADD_MEMBER: 'Add Member',
  REMOVE_MEMBER: 'Remove Member',
  UPDATE_ROLE: 'Update Role',
  CREATE_TEAM: 'Create Team',
  EDIT_TEAM: 'Edit Team',
  DELETE_TEAM: 'Delete Team',
  
  // Issue Actions
  ADD_ISSUE: 'Add Issue',
  RESOLVE_ISSUE: 'Resolve Issue',
  ARCHIVE_ISSUE: 'Archive Issue',
  
  // Navigation
  BACK_TO_DASHBOARD: 'Back to Dashboard',
  BACK_TO_GOALS: 'Back to Goals',
  BACK_TO_TASKS: 'Back to Tasks',
  OPEN_DASHBOARD: 'Open Dashboard',
  
  // Filter/Search Actions
  SHOW_RESULTS: 'Show Results',
  SHOW_ALL: 'Show All',
  APPLY_FILTERS: 'Apply Filters',
  CLEAR_FILTERS: 'Clear Filters',
  
  // Form Actions
  SEND_INVITE: 'Send Invite',
  CREATE_ACCOUNT: 'Create Account',
  SAVE_CHANGES: 'Save Changes',
  SEND_FEEDBACK: 'Send Feedback',
  
  // Confirmations - use specific entity action
  DELETE_PERMANENTLY: 'Delete Permanently',
  ARCHIVE: 'Archive',
  
  // Generic (use sparingly)
  CANCEL: 'Cancel',
  CLOSE: 'Close',
  NEXT: 'Next',
  PREVIOUS: 'Previous',
  DONE: 'Done',
  SAVE: 'Save',
  
  // Dynamic templates (use functions for these)
  deleteEntity: (entity: string) => `Delete ${entity}`,
  updateEntity: (entity: string) => `Update ${entity}`,
  saveEntity: (entity: string) => `Save ${entity}`,
  editEntity: (entity: string) => `Edit ${entity}`,
  archiveEntity: (entity: string) => `Archive ${entity}`,
  viewEntity: (entity: string) => `View ${entity}`,
  addEntity: (entity: string) => `Add ${entity}`,
} as const;
