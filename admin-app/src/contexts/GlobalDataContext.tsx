import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useMeetingDataFetcher } from '@/hooks/meeting/useMeetingDataFetcher';
import { useMeetingDataProcessor } from '@/hooks/meeting/useMeetingDataProcessor';
import { useUnifiedTasksData } from '@/hooks/useUnifiedTasksData';
import { logger } from '@/utils/logger';

interface MeetingWithTeam {
  id: string;
  team_id: string;
  team_name: string;
  company_name: string;
  meeting_type: string;
  current_section: number;
  started_at: string;
  ended_at: string | null;
  scriber_id: string | null;
  status: string;
  average_rating?: number;
  total_duration_seconds?: number;
}

interface GlobalDataContextType {
  // Meeting data
  meetings: MeetingWithTeam[];
  loadingMeetings: boolean;
  fetchMeetings: (teamIds: string[], companyTeams: any[]) => Promise<void>;
  clearMeetings: () => void;
  addMeetingToCache: (meeting: MeetingWithTeam) => void;
  removeMeetingFromCache: (teamId: string) => void;
  
  // Tasks data
  tasks: any[];
  teams: any[];
  tasksLoading: boolean;
  tasksError: string | null;
  refetchTasks: () => void;
}

const GlobalDataContext = createContext<GlobalDataContextType | undefined>(undefined);

export const GlobalDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [meetings, setMeetings] = useState<MeetingWithTeam[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const { fetchMeetingsData } = useMeetingDataFetcher();
  const { processMeetingsData } = useMeetingDataProcessor();
  
  // Centralized tasks and teams data
  const {
    tasks,
    teams,
    loading: tasksLoading,
    error: tasksError,
    refetch: refetchTasks
  } = useUnifiedTasksData();
  
  // Request deduplication
  const activeRequestRef = useRef<Promise<void> | null>(null);
  const lastRequestKeyRef = useRef<string>('');

  // Enhanced deduplication with performance config
  const fetchMeetings = useCallback(async (teamIds: string[], companyTeams: any[]) => {
    const requestKey = [...teamIds].sort().join(',');
    
    // Enhanced deduplication with configurable cache duration  
    if (requestKey === lastRequestKeyRef.current && activeRequestRef.current) {
      return activeRequestRef.current;
    }

    // Skip if no teams
    if (teamIds.length === 0) {
      setMeetings([]);
      return;
    }

    setLoadingMeetings(true);
    lastRequestKeyRef.current = requestKey;

    const requestPromise = (async () => {
      try {
        const meetingsData = await fetchMeetingsData(teamIds);
        const processedMeetings = processMeetingsData(meetingsData, companyTeams);
        setMeetings(processedMeetings);
      } catch (error) {
        logger.error('GlobalDataContext: Error fetching meetings:', error);
        setMeetings([]);
      } finally {
        setLoadingMeetings(false);
        activeRequestRef.current = null;
      }
    })();

    activeRequestRef.current = requestPromise;
    return requestPromise;
  }, [fetchMeetingsData, processMeetingsData]);

  const clearMeetings = useCallback(() => {
    setMeetings([]);
    activeRequestRef.current = null;
    lastRequestKeyRef.current = '';
  }, []);

  // Add a single meeting to cache for instant sync (prevents duplicates)
  const addMeetingToCache = useCallback((meeting: MeetingWithTeam) => {
    setMeetings(prev => {
      // Check if meeting already exists
      if (prev.some(m => m.id === meeting.id)) {
        return prev;
      }
      // Add new meeting at the beginning
      return [meeting, ...prev];
    });
  }, []);

  // Remove a meeting from cache for instant sync when meeting ends
  const removeMeetingFromCache = useCallback((teamId: string) => {
    logger.log('🗑️ GlobalDataContext: Removing meeting from cache', { teamId });
    setMeetings(prev => prev.filter(m => m.team_id !== teamId));
  }, []);

  // Reset deduplication without clearing data - prevents flickering
  const resetDeduplication = useCallback(() => {
    activeRequestRef.current = null;
    lastRequestKeyRef.current = '';
  }, []);

  return (
    <GlobalDataContext.Provider value={{
      // Meeting data
      meetings,
      loadingMeetings,
      fetchMeetings,
      clearMeetings,
      addMeetingToCache,
      removeMeetingFromCache,
      
      // Tasks data
      tasks,
      teams,
      tasksLoading,
      tasksError,
      refetchTasks
    }}>
      {children}
    </GlobalDataContext.Provider>
  );
};

export const useGlobalData = () => {
  const context = useContext(GlobalDataContext);
  if (context === undefined) {
    throw new Error('useGlobalData must be used within a GlobalDataProvider');
  }
  return context;
};