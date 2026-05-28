import React, { useEffect, useState, useCallback } from 'react';
import { Monitor } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { logger } from '@/utils/logger';

export const useDesktopHint = () => {
  const { user } = useAuth();
  const [showHint, setShowHint] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    const checkHintStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('has_seen_desktop_hint')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          logger.error('Error checking desktop hint status:', error);
          setIsLoading(false);
          return;
        }

        const hasSeen = data?.has_seen_desktop_hint ?? false;
        setShowHint(!hasSeen);
        setIsLoading(false);
      } catch (err) {
        logger.error('Failed to check desktop hint status:', err);
        setIsLoading(false);
      }
    };

    checkHintStatus();
  }, [user?.id]);

  const dismissHint = useCallback(async () => {
    setShowHint(false);

    if (!user?.id) return;

    try {
      await supabase
        .from('user_settings')
        .upsert(
          {
            user_id: user.id,
            has_seen_desktop_hint: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
    } catch (err) {
      logger.error('Failed to persist desktop hint dismissal:', err);
    }
  }, [user?.id]);

  return { showHint, dismissHint, isLoading };
};

export const DesktopRecommendedDialog: React.FC = () => {
  const { showHint, dismissHint } = useDesktopHint();

  return (
    <Dialog open={showHint} onOpenChange={(open) => { if (!open) dismissHint(); }}>
      <DialogContent className="sm:max-w-[360px] rounded-2xl mx-4">
        <DialogHeader className="items-center text-center pt-2">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Monitor className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-lg">Get the Full Experience</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed pt-1">
            For the best experience with all features — including meetings, dashboards, and advanced settings — access Zentrix on a computer browser.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center pt-2 pb-1">
          <Button onClick={dismissHint} className="w-full">
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
