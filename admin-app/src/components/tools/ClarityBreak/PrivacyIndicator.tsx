
import { Lock, Eye } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function PrivacyIndicator() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-success/5 border border-green-200 rounded-lg px-3 py-2">
            <Lock className="w-4 h-4 text-success" />
            <span className="text-success font-medium">Private to you</span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Eye className="w-4 h-4" />
              Who can see this?
            </div>
            <ul className="text-xs space-y-1">
              <li>✅ You (session owner)</li>
              <li>❌ Team members</li>
              <li>❌ Company members</li>
              <li>❌ Administrators</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-2">
              Your clarity break sessions are completely private and secure.
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
