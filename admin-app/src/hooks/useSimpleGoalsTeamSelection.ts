import { useState, useEffect, useRef } from 'react';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';

const STORAGE_KEY = 'goals-team-selection';

export const useSimpleGoalsTeamSelection = (teams: any[]) => {
  const { currentCompany } = useMultiCompany();
  const storageTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [selectedTeamId, setSelectedTeamId] = useState<string>(() => {
    if (teams.length === 0) return '';
    
    const companyStorageKey = currentCompany ? `${STORAGE_KEY}-${currentCompany?.id}` : STORAGE_KEY;
    const saved = localStorage.getItem(companyStorageKey);
    
    // Return saved team if it exists in current teams, otherwise first team
    return (saved && teams.find(t => t.id === saved)) ? saved : teams[0]?.id || '';
  });

  // Update selection when teams change or company changes
  useEffect(() => {
    if (teams.length === 0) {
      setSelectedTeamId(prev => prev === '' ? prev : '');
      return;
    }

    const companyStorageKey = currentCompany ? `${STORAGE_KEY}-${currentCompany?.id}` : STORAGE_KEY;
    const saved = localStorage.getItem(companyStorageKey);
    
    const newTeamId = (saved && teams.find(t => t.id === saved)) ? saved : teams[0]?.id || '';
    
    // Only update if value actually changed to prevent cascading re-renders
    setSelectedTeamId(prev => prev === newTeamId ? prev : newTeamId);
  }, [teams, currentCompany?.id]);

  const updateSelectedTeamId = (teamId: string) => {
    const companyStorageKey = currentCompany ? `${STORAGE_KEY}-${currentCompany?.id}` : STORAGE_KEY;
    
    setSelectedTeamId(teamId);
    
    // Debounce localStorage updates to prevent excessive writes
    if (storageTimeoutRef.current) {
      clearTimeout(storageTimeoutRef.current);
    }
    storageTimeoutRef.current = setTimeout(() => {
      localStorage.setItem(companyStorageKey, teamId);
    }, 300);
  };

  return {
    selectedTeamId,
    setSelectedTeamId: updateSelectedTeamId
  };
};