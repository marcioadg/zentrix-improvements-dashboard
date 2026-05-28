/**
 * Utility functions for filtering teams consistently across the application
 */

interface Team {
  id: string;
  name: string;
  description?: string;
  company_id: string;
  role?: string;
  is_leadership?: boolean;
}

/**
 * Filters out the "General" team from an array of teams
 * This ensures the auto-created "General" team is never shown in UI components
 * while preserving it for backend operations like invitations and membership
 */
export const filterGeneralTeam = <T extends Team>(teams: T[]): T[] => {
  if (!Array.isArray(teams)) return [];
  return teams.filter(team => {
    const name = team?.name;
    if (!name) return true; // keep teams with missing names (don't crash)
    return name.toLowerCase() !== 'general' &&
           name.toLowerCase() !== 'general team';
  });
};

/**
 * Checks if a team is the "General" team
 */
export const isGeneralTeam = (team: Team): boolean => {
  const name = team?.name;
  if (!name) return false;
  return name.toLowerCase() === 'general' ||
         name.toLowerCase() === 'general team';
};