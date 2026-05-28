import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logger';

interface UserNotificationSettings {
  id: string;
  task_assigned_enabled: boolean;
}

export const useUserNotificationSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserNotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_notification_settings')
        .select('id, task_assigned_enabled')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setSettings(data);
      } else {
        // Auto-create if doesn't exist (fallback for existing users)
        const { data: newData, error: insertError } = await supabase
          .from('user_notification_settings')
          .insert({ user_id: user.id, task_assigned_enabled: true })
          .select('id, task_assigned_enabled')
          .single();
        
        if (!insertError && newData) {
          setSettings(newData);
        }
      }
    } catch (error) {
      logger.error('Error fetching notification settings:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const updateTaskAssignedEnabled = useCallback(async (enabled: boolean) => {
    if (!settings?.id) return false;
    
    try {
      setSaving(true);
      const { error } = await supabase
        .from('user_notification_settings')
        .update({ 
          task_assigned_enabled: enabled, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', settings.id);

      if (error) throw error;
      
      setSettings(prev => prev ? { ...prev, task_assigned_enabled: enabled } : null);
      return true;
    } catch (error) {
      logger.error('Error updating notification settings:', error);
      return false;
    } finally {
      setSaving(false);
    }
  }, [settings?.id]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return { settings, loading, saving, updateTaskAssignedEnabled };
};
