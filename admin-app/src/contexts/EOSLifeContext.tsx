import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface EOSLifeRating {
  do_what_you_love: number;
  with_people_you_love: number;
  make_huge_difference: number;
  be_compensated_appropriately: number;
  time_for_passions: number;
}

export interface EOSLifeSession {
  id: string;
  session_date: string;
  overall_average: number;
  notes?: string;
  ratings: EOSLifeRating;
}

export const EOS_LIFE_CATEGORIES = [
  { key: 'do_what_you_love' as keyof EOSLifeRating, label: 'Do what you love', description: 'Pursue work that brings you joy and fulfillment' },
  { key: 'with_people_you_love' as keyof EOSLifeRating, label: 'With people you love', description: 'Surround yourself with meaningful relationships' },
  { key: 'make_huge_difference' as keyof EOSLifeRating, label: 'Make a huge difference', description: 'Create positive impact in the world' },
  { key: 'be_compensated_appropriately' as keyof EOSLifeRating, label: 'Be compensated appropriately', description: 'Receive fair value for your contributions' },
  { key: 'time_for_passions' as keyof EOSLifeRating, label: 'Have time for other passions', description: 'Maintain balance for personal interests' }
];

interface EOSLifeContextType {
  sessions: EOSLifeSession[];
  isLoading: boolean;
  loadSessions: () => Promise<void>;
  saveSession: (date: string, ratings: EOSLifeRating, notes?: string) => Promise<string>;
  deleteSession: (sessionId: string) => Promise<void>;
}

const EOSLifeContext = createContext<EOSLifeContextType | undefined>(undefined);

let loadingPromise: Promise<void> | null = null;

export const EOSLifeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState<EOSLifeSession[]>([]);
  const { toast } = useToast();

  const loadSessions = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (loadingPromise) {
      return loadingPromise;
    }

    const executeLoad = async () => {
      try {
        setIsLoading(true);
        logger.log('🔄 EOSLife: Starting to load sessions...');
        
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('eos_life_sessions')
          .select('*')
          .order('session_date', { ascending: false });

        if (sessionsError) throw sessionsError;

        const { data: ratingsData, error: ratingsError } = await supabase
          .from('eos_life_ratings')
          .select('*');

        if (ratingsError) throw ratingsError;

        const sessionsWithRatings = sessionsData.map(session => {
          const sessionRatings = ratingsData.filter(rating => rating.session_id === session.id);
          const ratings: EOSLifeRating = {
            do_what_you_love: sessionRatings.find(r => r.category === 'do_what_you_love')?.rating || 1,
            with_people_you_love: sessionRatings.find(r => r.category === 'with_people_you_love')?.rating || 1,
            make_huge_difference: sessionRatings.find(r => r.category === 'make_huge_difference')?.rating || 1,
            be_compensated_appropriately: sessionRatings.find(r => r.category === 'be_compensated_appropriately')?.rating || 1,
            time_for_passions: sessionRatings.find(r => r.category === 'time_for_passions')?.rating || 1,
          };

          return {
            id: session.id,
            session_date: session.session_date,
            overall_average: session.overall_average || 0,
            notes: session.notes,
            ratings
          };
        });

        logger.log('✅ EOSLife: Loaded sessions successfully:', sessionsWithRatings.length, 'sessions');
        setSessions(sessionsWithRatings);
      } catch (error) {
        logger.error('❌ EOSLife: Error loading sessions:', error);
        toast({
          title: "Error loading sessions",
          description: "Failed to load your EOS Life data.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
        loadingPromise = null;
      }
    };

    loadingPromise = executeLoad();
    return loadingPromise;
  }, [toast]);

  const saveSession = useCallback(async (date: string, ratings: EOSLifeRating, notes?: string) => {
    try {
      setIsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Calculate overall average
      const ratingsArray = Object.values(ratings);
      const overallAverage = ratingsArray.reduce((sum, rating) => sum + rating, 0) / ratingsArray.length;

      // Create or update session
      const { data: sessionData, error: sessionError } = await supabase
        .from('eos_life_sessions')
        .upsert({
          user_id: user.id,
          session_date: date,
          overall_average: overallAverage,
          notes: notes || null,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Delete existing ratings for this session
      const { error: deleteError } = await supabase
        .from('eos_life_ratings')
        .delete()
        .eq('session_id', sessionData.id);

      if (deleteError) throw deleteError;

      // Insert new ratings
      const ratingsToInsert = Object.entries(ratings).map(([category, rating]) => ({
        session_id: sessionData.id,
        category,
        rating,
      }));

      const { error: ratingsError } = await supabase
        .from('eos_life_ratings')
        .insert(ratingsToInsert);

      if (ratingsError) throw ratingsError;

      toast({
        title: "Session saved",
        description: "Your EOS Life ratings have been saved successfully.",
      });

      await loadSessions();
      return sessionData.id;
    } catch (error) {
      logger.error('Error saving EOS Life session:', error);
      toast({
        title: "Error saving session",
        description: "Failed to save your EOS Life ratings.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast, loadSessions]);

  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('eos_life_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      toast({
        title: "Session deleted",
        description: "Your EOS Life session has been deleted.",
      });

      await loadSessions();
    } catch (error) {
      logger.error('Error deleting session:', error);
      toast({
        title: "Error deleting session",
        description: "Failed to delete the session.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, loadSessions]);

  useEffect(() => {
    loadSessions();
  }, []); // Remove loadSessions dependency to prevent infinite loop

  return (
    <EOSLifeContext.Provider value={{
      sessions,
      isLoading,
      loadSessions,
      saveSession,
      deleteSession,
    }}>
      {children}
    </EOSLifeContext.Provider>
  );
};

export const useEOSLife = () => {
  const context = useContext(EOSLifeContext);
  if (context === undefined) {
    throw new Error('useEOSLife must be used within an EOSLifeProvider');
  }
  return context;
};