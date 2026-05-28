import { useEffect } from 'react';
import { toast } from 'sonner';
import { useNotifications } from '@/hooks/useNotifications';

export function useNotificationToasts() {
  const { notifications } = useNotifications();

  useEffect(() => {
    // Show toast for urgent notifications (task deadline warnings)
    const urgentNotifications = notifications.filter(
      notification => 
        !notification.read_status && 
        notification.type === 'task_deadline_warning' &&
        // Only show toast for notifications created in the last 5 minutes
        new Date(notification.created_at).getTime() > Date.now() - 5 * 60 * 1000
    );

    urgentNotifications.forEach(notification => {
      toast.warning(notification.title, {
        description: notification.description,
        duration: 8000, // Longer duration for urgent items
        id: notification.id, // Prevent duplicate toasts
      });
    });
  }, [notifications]);
}