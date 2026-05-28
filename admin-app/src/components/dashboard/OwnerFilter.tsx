import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Loader2, AlertCircle } from 'lucide-react';
import { useOwnerData } from '@/hooks/useOwnerData';
import { WeeklyMetricWithOwner } from '@/types/weeklyMetrics';
import { logger } from '@/utils/logger';
interface OwnerFilterProps {
  metrics: WeeklyMetricWithOwner[];
  selectedOwnerId: string;
  onOwnerChange: (ownerId: string) => void;
  loading?: boolean;
  disabled?: boolean;
}
export const OwnerFilter: React.FC<OwnerFilterProps> = ({
  metrics,
  selectedOwnerId,
  onOwnerChange,
  loading = false,
  disabled = false
}) => {
  const {
    uniqueOwners,
    isValidOwnerSelection,
    resetToValidOwner,
    getOwnerName
  } = useOwnerData(metrics);

  // Auto-correct invalid selections with debouncing
  const [correctionTimer, setCorrectionTimer] = React.useState<NodeJS.Timeout | null>(null);
  React.useEffect(() => {
    if (!isValidOwnerSelection(selectedOwnerId) && !loading) {
      // Debounce the correction to avoid rapid changes during data loading
      if (correctionTimer) {
        clearTimeout(correctionTimer);
      }
      const timer = setTimeout(() => {
        const validOwnerId = resetToValidOwner(selectedOwnerId);
        if (validOwnerId !== selectedOwnerId) {
          logger.log('🔄 OwnerFilter: Auto-correcting invalid selection', {
            from: selectedOwnerId,
            to: validOwnerId,
            availableOwners: uniqueOwners.length
          });
          onOwnerChange(validOwnerId);
        }
      }, 500); // 500ms debounce

      setCorrectionTimer(timer);
    }
    return () => {
      if (correctionTimer) {
        clearTimeout(correctionTimer);
      }
    };
  }, [selectedOwnerId, isValidOwnerSelection, resetToValidOwner, onOwnerChange, loading, uniqueOwners.length]);

  // Determine the current state for UI feedback
  const hasOwners = uniqueOwners.length > 0;
  const isValidSelection = isValidOwnerSelection(selectedOwnerId);
  const isDisabled = disabled || loading; // Only disable during actual loading, not when no owners

  // Enhanced state indicator
  const getStateIndicator = () => {
    if (loading) {
      return {
        icon: Loader2,
        className: "h-3 w-3 animate-spin",
        color: "text-muted-foreground"
      };
    }
    if (!hasOwners && !loading) {
      return {
        icon: AlertCircle,
        className: "h-3 w-3",
        color: "text-muted-foreground"
      };
    }
    return null; // Remove warning for invalid selection to reduce UI noise
  };
  const stateIndicator = getStateIndicator();
  return <div className="flex items-center gap-2">
      
      <Select value={isValidSelection ? selectedOwnerId : 'all'} onValueChange={onOwnerChange} disabled={isDisabled}>
        <SelectTrigger className="w-40"> {/* Remove border warning styling */}
          <div className="flex items-center justify-between w-full">
            <SelectValue placeholder={loading ? "Loading owners..." : !hasOwners ? "No owners available" : getOwnerName(selectedOwnerId)} />
            {stateIndicator && <stateIndicator.icon className={`${stateIndicator.className} ${stateIndicator.color}`} />}
          </div>
        </SelectTrigger>
        <SelectContent className="bg-background border shadow-lg">
          <SelectItem value="all">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>All Owners</span>
            </div>
          </SelectItem>
          {loading && <SelectItem value="loading" disabled>
              <div className="flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Loading owners...</span>
              </div>
            </SelectItem>}
          {!loading && uniqueOwners.length === 0 && <SelectItem value="empty" disabled>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-3 w-3 text-muted-foreground" />
                <span>No owners found</span>
              </div>
            </SelectItem>}
          {uniqueOwners.map(owner => <SelectItem key={owner.id} value={owner.id}>
              <div className="flex items-center gap-2">
                {owner.avatar_url ? <img src={owner.avatar_url} alt={owner.name} className="h-4 w-4 rounded-full" onError={e => {
              e.currentTarget.style.display = 'none';
            }} /> : <div className="h-4 w-4 rounded-full bg-muted flex items-center justify-center text-xs">
                    {owner.name.charAt(0)}
                  </div>}
                <span className="truncate">{owner.name}</span>
              </div>
            </SelectItem>)}
        </SelectContent>
      </Select>
    </div>;
};