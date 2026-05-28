import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff } from 'lucide-react';
interface RealtimeConnectionStatusProps {
  connected?: boolean;
  className?: string;
}
export const RealtimeConnectionStatus: React.FC<RealtimeConnectionStatusProps> = ({
  connected = false,
  className = "fixed bottom-4 right-4 z-50"
}) => {
  return <div className={className}>
      
    </div>;
};