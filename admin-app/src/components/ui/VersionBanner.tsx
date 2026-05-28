import { useVersionCheck } from '@/hooks/useVersionCheck';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export function VersionBanner() {
  const showVersionBanner = useVersionCheck();

  if (!showVersionBanner) return null;

  return (
    <div className="fixed top-4 right-4 z-50 bg-card border border-border rounded-[6px] shadow-sm p-4 max-w-sm animate-in slide-in-from-top-2">
      <div className="flex items-start gap-3">
        <RefreshCw className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <p className="text-[13px] font-medium text-foreground">
            New version available
          </p>
          <p className="text-[11px] text-muted-foreground">
            Please refresh to get the latest updates.
          </p>
          <Button
            onClick={() => window.location.reload()}
            size="sm"
            className="w-full"
          >
            Refresh Now
          </Button>
        </div>
      </div>
    </div>
  );
}
