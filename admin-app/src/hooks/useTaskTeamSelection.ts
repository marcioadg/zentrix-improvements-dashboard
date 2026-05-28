import { useState, useEffect } from 'react';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { safeStorage } from '@/utils/safeStorage';

const STORAGE_KEY = 'task-team-selection';

export const useTaskTeamSelection = (teams: any[]) => {
  const { currentCompany } = useMultiCompany();
  
  // Initialize with "All" selected immediately to prevent flickering
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(() => {
    // Start with "All" as default - don't wait for teams to load
    return ['personal'];
  });

  // Load from localStorage or default to "All" when teams are available
  useEffect(() => {
    const companyStorageKey = currentCompany ? `${STORAGE_KEY}-${currentCompany?.id}` : STORAGE_KEY;
    const stored = safeStorage.getItem(companyStorageKey);

    // Helper function to get all available team IDs (personal + all teams)
    const getAllTeamIds = () => ['personal', ...teams.map(t => t.id)];
    
    // If we have teams loaded
    if (teams.length > 0) {
      if (stored) {
        try {
          const parsedSelection = JSON.parse(stored);
          // Validate that selected teams still exist in the current company
          const validSelection = parsedSelection.filter((teamId: string) => 
            teamId === 'personal' || teams.some(t => t.id === teamId)
          );
          
          if (validSelection.length > 0) {
            setSelectedTeamIds(validSelection);
          } else {
            // If no valid teams, default to "All"
            const allTeamIds = getAllTeamIds();
            setSelectedTeamIds(allTeamIds);
          }
        } catch {
          // If parsing fails, default to "All"
          const allTeamIds = getAllTeamIds();
          setSelectedTeamIds(allTeamIds);
        }
      } else {
        // Default to "All" - personal + all teams
        const allTeamIds = getAllTeamIds();
        setSelectedTeamIds(allTeamIds);
      }
    }
    // If no teams yet, keep the default ['personal'] to prevent empty selection
  }, [teams, currentCompany?.id]);

  // Save to localStorage whenever selection changes
  const updateSelection = (teamIds: string[]) => {
    const companyStorageKey = currentCompany ? `${STORAGE_KEY}-${currentCompany?.id}` : STORAGE_KEY;
    
    // Ensure at least one item is always selected
    if (teamIds.length === 0) {
      const allTeamIds = ['personal', ...teams.map(t => t.id)];
      setSelectedTeamIds(allTeamIds);
      safeStorage.setItem(companyStorageKey, JSON.stringify(allTeamIds));
    } else {
      setSelectedTeamIds(teamIds);
      safeStorage.setItem(companyStorageKey, JSON.stringify(teamIds));
    }
  };

  return {
    selectedTeamIds,
    updateSelection
  };
};
