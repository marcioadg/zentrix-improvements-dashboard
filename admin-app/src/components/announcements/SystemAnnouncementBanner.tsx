import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface SystemAnnouncement {
  id: string;
  message: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const SystemAnnouncementBanner: React.FC = () => {
  const [announcement, setAnnouncement] = useState<SystemAnnouncement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const fetchActiveAnnouncement = async () => {
      try {
        const { data, error } = await supabase
          .from('system_announcements')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
          logger.error('Error fetching announcement:', error);
          return;
        }

        if (data) {
          setAnnouncement(data);
          // Check if this announcement was previously dismissed
          const dismissedAnnouncements = JSON.parse(
            localStorage.getItem('dismissedAnnouncements') || '[]'
          );
          const wasDismissed = dismissedAnnouncements.includes(data.id);
          
          if (!wasDismissed) {
            setIsVisible(true);
          }
        } else {
          setAnnouncement(null);
          setIsVisible(false);
        }
      } catch (error) {
        logger.error('Error fetching active announcement:', error);
      }
    };

    fetchActiveAnnouncement();

    // Set up real-time subscription for announcements
    const channel = supabase
      .channel('system_announcements')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_announcements'
        },
        () => {
          fetchActiveAnnouncement();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDismiss = () => {
    if (announcement) {
      // Save dismissed announcement to localStorage
      let dismissedAnnouncements: string[] = [];
      try {
        dismissedAnnouncements = JSON.parse(
          localStorage.getItem('dismissedAnnouncements') || '[]'
        );
      } catch {
        dismissedAnnouncements = [];
      }
      dismissedAnnouncements.push(announcement.id);
      localStorage.setItem('dismissedAnnouncements', JSON.stringify(dismissedAnnouncements));
      
      setIsDismissed(true);
      setIsVisible(false);
    }
  };

  if (!isVisible || !announcement || isDismissed) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-destructive text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 text-center">
            <p className="text-sm font-medium">{announcement.message}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-white hover:bg-red-700 p-1 h-auto ml-4 flex-shrink-0"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss announcement</span>
          </Button>
        </div>
      </div>
    </div>
  );
};