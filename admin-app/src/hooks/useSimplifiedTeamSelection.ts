import { useState, useEffect, useCallback } from 'react';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { safeStorage } from '@/utils/safeStorage';

const STORAGE_KEY = 'task-team-selection';

export const useSimplifiedTeamSelection = () => {
  const { currentCompany } = useMultiCompany();
  
  // Start with personal by default - no dependencies on teams loading
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(['personal']);

  // Load from localStorage when component mounts
  useEffect(() => {
    const companyStorageKey = currentCompany ? `${STORAGE_KEY}-${currentCompany?.id}` : STORAGE_KEY;
    const stored = safeStorage.getItem(companyStorageKey);

    if (stored) {
      try {
        const parsedSelection = JSON.parse(stored);
        if (Array.isArray(parsedSelection) && parsedSelection.length > 0) {
          setSelectedTeamIds(parsedSelection);
        }
      } catch {
        // Keep default if parsing fails
      }
    }
  }, [currentCompany?.id]);

  // Save to localStorage whenever selection changes
  const updateSelection = useCallback((teamIds: string[]) => {
    const companyStorageKey = currentCompany ? `${STORAGE_KEY}-${currentCompany?.id}` : STORAGE_KEY;
    
    // Ensure at least one item is always selected
    const finalSelection = teamIds.length === 0 ? ['personal'] : teamIds;
    
    setSelectedTeamIds(finalSelection);
    safeStorage.setItem(companyStorageKey, JSON.stringify(finalSelection));
  }, [currentCompany?.id]);

  return {
    selectedTeamIds,
    updateSelection
  };
};
