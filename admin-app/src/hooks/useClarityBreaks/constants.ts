
export const CLARITY_BREAK_ERRORS = {
  FETCH_HISTORY: "Can't load breaks. Try refreshing?",
  CREATE_SESSION: "Can't start break. Try again?", 
  RESUME_SESSION: "Can't resume break. Try again?",
  ABANDON_SESSION: "Can't exit break. Try again?",
  SAVE_ENTRY: "Can't save entry. Retry?",
  COMPLETE_SESSION: "Can't save break. Check connection?",
  FETCH_ENTRIES: "Can't load entries. Refresh?"
} as const;

export const CLARITY_BREAK_SUCCESS = {
  SESSION_ABANDONED: "Break exited",
  SESSION_ABANDONED_DESC: "Session not saved",
  SESSION_COMPLETED: "Break saved", 
  SESSION_COMPLETED_DESC: "Added to your history"
} as const;

export const DEFAULT_SELECT_FIELDS = '*' as const;
