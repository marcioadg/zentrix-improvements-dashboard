import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { syncStripeMRR } from '@/services/stripeSyncService';
import { toast } from 'sonner';

interface SyncStripeMRRButtonProps {
  onSyncComplete?: () => void;
}

export const SyncStripeMRRButton: React.FC<SyncStripeMRRButtonProps> = ({ onSyncComplete }) => {
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncStripeMRR();
      
      if (result.success) {
        toast.success(`MRR synchronized successfully! ${result.updatedCount || 0} subscriptions updated.`);
        onSyncComplete?.();
      } else {
        toast.error(`Error synchronizing MRR: ${result.error}`);
      }
    } catch (error: any) {
      toast.error(`Error synchronizing MRR: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Button
      onClick={handleSync}
      disabled={syncing}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
      {syncing ? 'Synchronizing...' : 'Sync Stripe MRR'}
    </Button>
  );
};
