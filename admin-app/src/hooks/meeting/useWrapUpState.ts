
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useWrapUpState = (members: any[], currentUserId: string | null, getRating: any) => {
  const [ratingInputs, setRatingInputs] = useState<Record<string, string>>({});
  const [absentMembers, setAbsentMembers] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasAutoRefreshed, setHasAutoRefreshed] = useState(false);

  // Initialize rating input with existing self-rating
  useEffect(() => {
    const initialRatings: Record<string, string> = {};
    if (currentUserId) {
      const existingSelfRating = getRating(currentUserId);
      if (existingSelfRating) {
        initialRatings[currentUserId] = existingSelfRating.toString();
      }
    }
    setRatingInputs(initialRatings);
  }, [currentUserId, getRating]);

  const handleRatingChange = (memberId: string, value: string) => {
    setRatingInputs(prev => ({
      ...prev,
      [memberId]: value
    }));
  };

  const handleAbsentToggle = (memberId: string, isAbsent: boolean) => {
    setAbsentMembers(prev => {
      const newSet = new Set(prev);
      if (isAbsent) {
        newSet.add(memberId);
        // Clear rating input for absent member
        setRatingInputs(prevInputs => ({
          ...prevInputs,
          [memberId]: ''
        }));
      } else {
        newSet.delete(memberId);
      }
      return newSet;
    });
  };

  return {
    ratingInputs,
    absentMembers,
    isRefreshing,
    hasAutoRefreshed,
    setIsRefreshing,
    setHasAutoRefreshed,
    setAbsentMembers,
    handleRatingChange,
    handleAbsentToggle
  };
};

export const useCurrentUser = () => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  return currentUserId;
};
