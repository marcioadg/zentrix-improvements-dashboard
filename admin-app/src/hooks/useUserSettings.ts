
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { supabase } from '@/integrations/supabase/client';
import {
  DEFAULT_METRICS_COMPANY_VIEW_SETTINGS,
  MetricsCompanyViewSettings,
  isMetricsCompanyViewSettingKey,
  mergeMetricsCompanyViewSettings,
  parseMetricsCompanyViewSettings,
} from '@/lib/metricsCompanyViewSettings';

// This hook is now a wrapper around the global settings context
// for backward compatibility with existing code
export const useUserSettings = (_selectedTeamId?: string | null) => {
  const { settings, loading, updateSettings, updateThemeColor, refetch } = useSettings();
  const { currentCompany } = useMultiCompany();
  const currentCompanyId = currentCompany?.id ?? null;
  const userId = settings?.user_id ?? null;
  const [companyViewSettings, setCompanyViewSettings] =
    useState<MetricsCompanyViewSettings | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadCompanyViewSettings = async () => {
      if (!userId || !currentCompanyId) {
        setCompanyViewSettings(null);
        return;
      }

      setCompanyViewSettings(null);

      const { data, error } = await supabase
        .from('company_members')
        .select('show_current_week, highlight_current_week')
        .eq('company_id', currentCompanyId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setCompanyViewSettings(DEFAULT_METRICS_COMPANY_VIEW_SETTINGS);
        return;
      }

      const nextViewSettings =
        parseMetricsCompanyViewSettings(data) ?? DEFAULT_METRICS_COMPANY_VIEW_SETTINGS;

      setCompanyViewSettings(nextViewSettings);
    };

    loadCompanyViewSettings();

    return () => {
      cancelled = true;
    };
  }, [userId, currentCompanyId]);

  const effectiveSettings = useMemo(() => {
    if (!settings) return settings;
    if (!userId || !currentCompanyId) return settings;

    const scopedViewSettings =
      companyViewSettings ?? DEFAULT_METRICS_COMPANY_VIEW_SETTINGS;

    return {
      ...settings,
      show_current_week: scopedViewSettings.show_current_week,
      highlight_current_week: scopedViewSettings.highlight_current_week,
    };
  }, [settings, userId, currentCompanyId, companyViewSettings]);

  const updateMetricsSettings = useCallback(async (updates: Partial<UserSettings>) => {
    const globalUpdates: Partial<UserSettings> = {};
    const viewUpdates: Partial<MetricsCompanyViewSettings> = {};

    Object.entries(updates).forEach(([key, value]) => {
      if (isMetricsCompanyViewSettingKey(key)) {
        viewUpdates[key] = Boolean(value);
      } else {
        (globalUpdates as Record<string, unknown>)[key] = value;
      }
    });

    if (Object.keys(viewUpdates).length > 0) {
      if (!userId || !currentCompanyId) {
        return false;
      }

      const previousViewSettings = companyViewSettings;
      const optimisticViewSettings = mergeMetricsCompanyViewSettings(
        previousViewSettings,
        viewUpdates
      );
      setCompanyViewSettings(optimisticViewSettings);

      const { data, error } = await supabase.rpc(
        'update_company_member_metrics_preferences',
        {
          p_company_id: currentCompanyId,
          p_show_current_week: viewUpdates.show_current_week ?? null,
          p_highlight_current_week: viewUpdates.highlight_current_week ?? null,
        }
      );

      if (error) {
        setCompanyViewSettings(previousViewSettings);
        return false;
      }

      const returnedViewSettings = Array.isArray(data)
        ? parseMetricsCompanyViewSettings(data[0])
        : parseMetricsCompanyViewSettings(data);

      setCompanyViewSettings(returnedViewSettings ?? optimisticViewSettings);
    }

    if (Object.keys(globalUpdates).length === 0) {
      return true;
    }

    return await updateSettings(globalUpdates);
  }, [companyViewSettings, currentCompanyId, updateSettings, userId]);

  const updateVoteLimit = async (voteLimit: number): Promise<boolean> => {
    return await updateSettings({ vote_limit: voteLimit });
  };

  return {
    settings: effectiveSettings,
    loading,
    updateMetricsSettings,
    updateVoteLimit,
    updateThemeColor,
    refetch,
  };
};

// Re-export the interface for backward compatibility
export interface UserSettings {
  id: string;
  user_id: string;
  highlight_current_week: boolean;
  show_current_week: boolean;
  week_start_day: 'monday' | 'sunday';
  vote_limit: number;
  invert_org_chart_colors: boolean;
  theme_preference: 'light' | 'dark' | 'system';
  theme_color: string;
  ai_system_prompt?: string | null;
  created_at: string;
  updated_at: string;
}

// Helper type for settings that can be partial
export interface PartialUserSettings {
  highlight_current_week?: boolean;
  show_current_week?: boolean;
  week_start_day?: 'monday' | 'sunday';
  vote_limit?: number;
  invert_org_chart_colors?: boolean;
  theme_preference?: 'light' | 'dark' | 'system';
  theme_color?: string;
  ai_system_prompt?: string | null;
}

// Helper function to create a complete UserSettings object with defaults
export const createFallbackUserSettings = (userId: string): UserSettings => ({
  id: `fallback-${userId}`,
  user_id: userId,
  highlight_current_week: false,
  show_current_week: false,
  week_start_day: 'sunday' as const,
  vote_limit: 5,
  invert_org_chart_colors: false,
  theme_preference: 'system' as const,
  theme_color: '∿ Thunder',
  ai_system_prompt: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});
