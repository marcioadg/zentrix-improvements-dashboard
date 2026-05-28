
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export interface UserSettings {
  id: string;
  user_id: string;
  highlight_current_week: boolean;
  show_current_week: boolean;
  week_start_day: 'monday' | 'sunday';
  vote_limit: number;
  auto_create_overdue_issues: boolean;
  invert_org_chart_colors: boolean;
  theme_preference: 'light' | 'dark' | 'system';
  theme_color: string;
  language_preference: string;
  ai_system_prompt?: string | null;
  hide_members_without_goals: boolean;
  created_at: string;
  updated_at: string;
}

interface SettingsContextType {
  settings: UserSettings | null;
  loading: boolean;
  updateSettings: (updates: Partial<UserSettings>) => Promise<boolean>;
  updateVoteLimit: (voteLimit: number) => Promise<boolean>;
  updateThemeColor: (color: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  // useSettings context check - logging reduced to prevent spam
  if (context === undefined) {
    logger.error('useSettings must be used within a SettingsProvider - context is undefined');
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserSettings = async () => {
    if (!user) {
      setSettings(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        logger.error('Error loading user settings:', error);
        setSettings(null);
      } else {
        const DEFAULT_THEME_COLOR = '∿ Thunder';
        let resolvedThemeColor: string = (data as any).theme_color || DEFAULT_THEME_COLOR;

        // If still on the default, check profiles.theme_color as a seed
        // (in case the user set their color in CRM or Insights first)
        if (resolvedThemeColor === DEFAULT_THEME_COLOR) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('theme_color')
            .eq('id', user.id)
            .single();
          const profileThemeColor = (profileData as any)?.theme_color;
          if (profileThemeColor && profileThemeColor !== DEFAULT_THEME_COLOR) {
            resolvedThemeColor = profileThemeColor;
          }
        }

        const typedSettings: UserSettings = {
          id: data.id,
          user_id: data.user_id,
          highlight_current_week: data.highlight_current_week || false,
          show_current_week: data.show_current_week || false,
          week_start_day: (data.week_start_day as 'monday' | 'sunday') || 'sunday',
          vote_limit: data.vote_limit || 25,
          auto_create_overdue_issues: data.auto_create_overdue_issues || false,
          invert_org_chart_colors: data.invert_org_chart_colors ?? false,
          theme_preference: (data.theme_preference as 'light' | 'dark' | 'system') || 'system',
          theme_color: resolvedThemeColor,
          language_preference: (data as any).language_preference || 'en',
          ai_system_prompt: data.ai_system_prompt ?? null,
          hide_members_without_goals: data.hide_members_without_goals ?? false,
          created_at: data.created_at,
          updated_at: data.updated_at
        };
        setSettings(typedSettings);
      }
    } catch (error) {
      logger.error('Error loading user settings:', error);
      setSettings(null);
    } finally {
      setLoading(false);
    }
  };

  // Set up real-time subscription for settings changes - OPTIMIZED
  useEffect(() => {
    if (!user) return;
    
    const channel = supabase
      .channel(`user-settings-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE', // 🎯 Only listen to UPDATEs to prevent cascade
          schema: 'public',
          table: 'user_settings',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new) {
            const updatedSettings: UserSettings = {
              id: payload.new.id,
              user_id: payload.new.user_id,
              highlight_current_week: payload.new.highlight_current_week || false,
              show_current_week: payload.new.show_current_week || false,
              week_start_day: (payload.new.week_start_day as 'monday' | 'sunday') || 'sunday',
              vote_limit: payload.new.vote_limit || 25,
              auto_create_overdue_issues: payload.new.auto_create_overdue_issues || false,
              invert_org_chart_colors: payload.new.invert_org_chart_colors ?? false,
              theme_preference: (payload.new.theme_preference as 'light' | 'dark' | 'system') || 'system',
              theme_color: payload.new.theme_color || '∿ Thunder',
              language_preference: payload.new.language_preference || 'en',
              ai_system_prompt: payload.new.ai_system_prompt ?? null,
              hide_members_without_goals: payload.new.hide_members_without_goals ?? false,
              created_at: payload.new.created_at,
              updated_at: payload.new.updated_at
            };
            
            // Deep comparison to prevent unnecessary re-renders
            setSettings(prev => {
              if (!prev) return updatedSettings;
              
              const hasChanged = 
                prev.highlight_current_week !== updatedSettings.highlight_current_week ||
                prev.show_current_week !== updatedSettings.show_current_week ||
                prev.week_start_day !== updatedSettings.week_start_day ||
                prev.vote_limit !== updatedSettings.vote_limit ||
                prev.auto_create_overdue_issues !== updatedSettings.auto_create_overdue_issues ||
                prev.invert_org_chart_colors !== updatedSettings.invert_org_chart_colors ||
                prev.theme_preference !== updatedSettings.theme_preference ||
                prev.theme_color !== updatedSettings.theme_color ||
                prev.ai_system_prompt !== updatedSettings.ai_system_prompt ||
                prev.hide_members_without_goals !== updatedSettings.hide_members_without_goals ||
                prev.updated_at !== updatedSettings.updated_at;
              
              if (!hasChanged) return prev;
              return updatedSettings;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Listen for cross-app theme_color changes written to profiles by CRM or Insights
  useEffect(() => {
    if (!user) return;

    const profileChannel = supabase
      .channel(`profile-theme-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          const newThemeColor = payload.new?.theme_color as string | undefined;
          if (newThemeColor && newThemeColor !== settings?.theme_color) {
            setSettings(prev => prev ? { ...prev, theme_color: newThemeColor } : prev);
            import('@/lib/themeColors').then(({ applyThemeColor }) => {
              applyThemeColor(newThemeColor);
            }).catch(() => {});
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
    };
  }, [user, settings?.theme_color]);

  // Load initial settings
  useEffect(() => {
    loadUserSettings();
  }, [user]);

  const updateSettings = useCallback(async (updates: Partial<UserSettings>): Promise<boolean> => {
    if (!user || !settings) return false;

    const optimisticSettings = { ...settings, ...updates };
    setSettings(optimisticSettings);

    try {
      const { error } = await supabase
        .from('user_settings')
        .update(updates)
        .eq('user_id', user.id);

      if (error) {
        logger.error('SettingsContext: Error updating settings:', error);
        setSettings(settings);
        toast({
          title: "Error",
          description: "Failed to update settings. Please try again.",
          variant: "destructive"
        });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('SettingsContext: Exception updating settings:', error);
      setSettings(settings);
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, settings]);

  const updateVoteLimit = useCallback(async (voteLimit: number): Promise<boolean> => {
    return await updateSettings({ vote_limit: voteLimit });
  }, [updateSettings]);

  const updateThemeColor = useCallback(async (color: string): Promise<boolean> => {
    const success = await updateSettings({ theme_color: color } as Partial<UserSettings>);
    if (success && user) {
      // Also write to profiles so CRM and Insights pick up the change immediately.
      // The DB trigger trg_user_settings_theme_to_profile does the same, but writing
      // directly here avoids any trigger latency for real-time subscribers.
      await supabase
        .from('profiles')
        .update({ theme_color: color, accent_color: color } as any)
        .eq('id', user.id);
    }
    return success;
  }, [updateSettings, user]);

  const refetch = useCallback(async () => {
    await loadUserSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const value = useMemo<SettingsContextType>(() => ({
    settings,
    loading,
    updateSettings,
    updateVoteLimit,
    updateThemeColor,
    refetch,
  }), [settings, loading, updateSettings, updateVoteLimit, updateThemeColor, refetch]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
