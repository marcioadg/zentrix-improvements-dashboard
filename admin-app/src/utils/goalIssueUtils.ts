// Shared utilities for creating goal issues with consistent naming
// This ensures both auto-creation and manual creation use the same format

export interface GoalIssueData {
  id: string;
  title: string;
  description?: string;
  status: string;
  owner_id: string;
  target_date?: string;
  is_company_goal?: boolean;
}

// Status labels mapping (should match what's used in goal components)
export const statusLabels = {
  on_track: 'On Track',
  off_track: 'Off Track',
  complete: 'Complete',
  canceled: 'Canceled'
} as const;

/**
 * Generates a standardized issue title for a goal
 */
export const generateGoalIssueTitle = (goal: GoalIssueData): string => {
  if (goal.is_company_goal) {
    return `Company Goal off-track: ${goal.title}`;
  }
  return `Goal off-track: ${goal.title}`;
};

/**
 * Generates a standardized issue description for a goal
 */
export const generateGoalIssueDescription = (
  goal: GoalIssueData,
  getProfileName: (userId: string) => string
): string => {
  const goalType = goal.is_company_goal ? 'Company Goal' : 'Goal';
  const statusLabel = statusLabels[goal.status as keyof typeof statusLabels] || goal.status;
  const ownerName = getProfileName(goal.owner_id);
  
  let description = `${goalType} Details:
Title: ${goal.title}`;

  if (goal.description) {
    description += `\nDescription: ${goal.description}`;
  }

  description += `\nStatus: ${statusLabel}
Owner: ${ownerName}`;

  if (goal.target_date) {
    const targetDate = new Date(goal.target_date + 'T12:00:00').toLocaleDateString();
    description += `\nTarget Date: ${targetDate}`;
  }

  description += `\n\nThis ${goal.is_company_goal ? 'company ' : ''}goal requires immediate attention to get back on track.`;

  return description;
};

/**
 * Creates a standardized goal issue data object for database insertion
 */
export const createGoalIssueData = (
  goal: GoalIssueData,
  teamId: string,
  createdBy: string,
  getProfileName: (userId: string) => string
) => {
  return {
    title: generateGoalIssueTitle(goal),
    description: generateGoalIssueDescription(goal, getProfileName),
    team_id: teamId,
    owner_id: goal.owner_id,
    created_by: createdBy,
    issue_type: 'short_term' as const,
    status: 'open' as const,
    archived: false
  };
};