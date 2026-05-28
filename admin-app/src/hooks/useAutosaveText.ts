
import { useEffect, useRef } from 'react';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { logger } from '@/utils/logger';

interface UseAutosaveTextOptions {
  delay?: number;
  onSave: (text: string) => Promise<void> | void;
  enabled?: boolean;
}

export const useAutosaveText = (
  text: string,
  options: UseAutosaveTextOptions
) => {
  const { delay = 2000, onSave, enabled = true } = options;
  const lastSavedRef = useRef<string>('');
  const isSavingRef = useRef(false);

  const [debouncedSave] = useDebouncedCallback(async (textToSave: string) => {
    if (!enabled || isSavingRef.current || textToSave === lastSavedRef.current) {
      return;
    }

    try {
      isSavingRef.current = true;
      await onSave(textToSave);
      lastSavedRef.current = textToSave;
    } catch (error) {
      logger.error('Auto-save failed:', error);
    } finally {
      isSavingRef.current = false;
    }
  }, delay);

  useEffect(() => {
    if (text && text !== lastSavedRef.current) {
      debouncedSave(text);
    }
  }, [text, debouncedSave]);

  return {
    isSaving: isSavingRef.current,
    hasUnsavedChanges: text !== lastSavedRef.current,
  };
};
