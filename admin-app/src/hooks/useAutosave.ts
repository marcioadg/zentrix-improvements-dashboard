
import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export const useAutosave = (
  data: any,
  saveFunction: (data: any) => Promise<void>,
  delay: number = 3000,
  enabled: boolean = true
) => {
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedRef = useRef<string>('');
  const isSavingRef = useRef(false);

  // Memoize the serialized data to avoid redundant JSON.stringify calls on every render
  const serializedData = useMemo(() => JSON.stringify(data), [data]);

  const saveData = useCallback(async () => {
    if (isSavingRef.current) return;

    try {
      isSavingRef.current = true;
      await saveFunction(data);
      lastSavedRef.current = serializedData;

      toast({
        title: "Auto-saved",
        description: "Your changes have been saved automatically.",
      });
    } catch (error) {
      logger.error('Autosave failed:', error);
      toast({
        title: "Autosave failed",
        description: "Your changes could not be saved automatically.",
        variant: "destructive",
      });
    } finally {
      isSavingRef.current = false;
    }
  }, [saveFunction, data, serializedData, toast]);

  useEffect(() => {
    if (!enabled) return;

    // Don't autosave if data hasn't changed
    if (serializedData === lastSavedRef.current) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => saveData(), delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [serializedData, delay, enabled, saveData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const hasUnsavedChanges = serializedData !== lastSavedRef.current;

  return {
    hasUnsavedChanges,
    isSaving: isSavingRef.current,
    forceSave: saveData
  };
};
