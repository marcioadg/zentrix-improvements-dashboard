
import { useState, useCallback, useEffect } from 'react';
import { logger } from '@/utils/logger';

interface TaskSettings {
  showArchived: boolean;
  showCompleted: boolean;
}

// Hardcoded settings - no ability to show archived or completed tasks
const fixedSettings: TaskSettings = {
  showArchived: false,
  showCompleted: false,
};

export const useTaskSettings = () => {
  const [settings] = useState<TaskSettings>(fixedSettings);

  // No-op update function since settings are now fixed
  const updateSettings = useCallback(() => {
    logger.log('📋 Task settings are now fixed - no updates allowed');
  }, []);

  useEffect(() => {
    logger.log('📋 Using fixed task settings:', fixedSettings);
  }, []);

  return {
    settings,
    updateSettings,
  };
};
