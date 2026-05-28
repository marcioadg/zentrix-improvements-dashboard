import { useEffect } from 'react';
import { toast } from 'sonner';

export const NetworkToast: React.FC = () => {
  useEffect(() => {
    const handleOffline = () => {
      toast.error("You're offline", {
        description: "Check your internet connection.",
        duration: Infinity,
        id: 'network-status',
      });
    };

    const handleOnline = () => {
      toast.success("You're back online", {
        id: 'network-status',
        duration: 3000,
      });
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return null;
};
