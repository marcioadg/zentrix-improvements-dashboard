import { useEffect } from 'react';
import { DEFAULT_ZENTRIX_SYSTEM_PROMPT } from '@/constants/aiPrompts';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logger';

const STORAGE_KEY = 'zentrix_ai_system_prompt';

export const usePersistedSystemPrompt = () => {
  const { user } = useAuth();
  const { settings, updateSettings, loading } = useSettings();
  
  // Derive system prompt from settings (use default if null/undefined)
  const systemPrompt = settings?.ai_system_prompt || DEFAULT_ZENTRIX_SYSTEM_PROMPT;
  
  const setSystemPrompt = async (newPrompt: string) => {
    if (!user) {
      logger.warn('⚠️ Cannot save system prompt: No user logged in');
      return;
    }
    
    const success = await updateSettings({ ai_system_prompt: newPrompt });
    if (success) {
      logger.log('💾 System prompt saved to database');
    } else {
      logger.error('❌ Failed to save system prompt to database');
    }
  };

  const resetToDefault = async () => {
    if (!user) {
      logger.warn('⚠️ Cannot reset system prompt: No user logged in');
      return;
    }
    
    const success = await updateSettings({ ai_system_prompt: null });
    if (success) {
      logger.log('🔄 System prompt reset to default (database set to NULL)');
    } else {
      logger.error('❌ Failed to reset system prompt in database');
    }
  };

  // One-time migration from localStorage to database
  useEffect(() => {
    const migrateFromLocalStorage = async () => {
      if (!user || loading || settings?.ai_system_prompt) return;
      
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && stored !== DEFAULT_ZENTRIX_SYSTEM_PROMPT) {
          logger.log('🔄 Migrating system prompt from localStorage to database...');
          const success = await updateSettings({ ai_system_prompt: stored });
          if (success) {
            localStorage.removeItem(STORAGE_KEY);
            logger.log('✅ Migration complete, localStorage cleared');
          }
        }
      } catch (error) {
        logger.error('❌ Error migrating system prompt:', error);
      }
    };
    
    migrateFromLocalStorage();
  }, [user, loading, settings?.ai_system_prompt]);

  return {
    systemPrompt,
    setSystemPrompt,
    resetToDefault,
    isDefault: !settings?.ai_system_prompt || settings.ai_system_prompt === DEFAULT_ZENTRIX_SYSTEM_PROMPT,
    loading
  };
};
