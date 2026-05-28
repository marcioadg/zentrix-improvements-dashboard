import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getDeviceTypeForTracking } from '@/utils/mobileDetection';

export const useLoginTracking = () => {
  useEffect(() => {
    const updateLastLogin = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Check if first_device_type is already set
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_device_type')
          .eq('id', user.id)
          .single();

        const updates: Record<string, string> = {
          last_login_at: new Date().toISOString(),
        };

        // Only set first_device_type once — on the very first login
        if (!profile?.first_device_type) {
          updates.first_device_type = getDeviceTypeForTracking();
        }

        await supabase
          .from('profiles')
          .update(updates)
          .eq('id', user.id)
          .single();
      }
    };

    // Update login time when hook is first used
    updateLastLogin();

    // Listen for auth state changes to track logins
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        updateLastLogin();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);
};