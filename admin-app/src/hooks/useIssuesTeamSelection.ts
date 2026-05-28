import { useState, useEffect } from 'react';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';

const STORAGE_KEY = 'issues-team-selection';

export const useIssuesTeamSelection = (teams: any[]) => {
  const { currentCompany } = useMultiCompany();
  
  // Initialize with empty string to prevent flickering
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');

  // Load from localStorage or default to first team when teams are available
  useEffect(() => {
    const companyStorageKey = currentCompany ? `${STORAGE_KEY}-${currentCompany?.id}` : STORAGE_KEY;
    const stored = localStorage.getItem(companyStorageKey);
    
    // If we have teams loaded
    if (teams.length > 0) {
      if (stored) {
        // Validate that selected team still exists in the current company
        const teamExists = teams.some(t => t.id === stored);
        
        if (teamExists) {
          setSelectedTeamId(stored);
        } else {
          // If stored team doesn't exist, default to first team
          setSelectedTeamId(teams[0].id);
        }
      } else {
        // Default to first team
        setSelectedTeamId(teams[0].id);
      }
    } else if (teams.length === 0) {
      // Clear selection if no teams - user will see appropriate empty state
      setSelectedTeamId('');
    }
  }, [teams, currentCompany?.id]);

  // Save to localStorage whenever selection changes
  const updateSelectedTeamId = (teamId: string) => {
    const companyStorageKey = currentCompany ? `${STORAGE_KEY}-${currentCompany?.id}` : STORAGE_KEY;
    
    setSelectedTeamId(teamId);
    localStorage.setItem(companyStorageKey, teamId);
  };

  return {
    selectedTeamId,
    setSelectedTeamId: updateSelectedTeamId
  };
};