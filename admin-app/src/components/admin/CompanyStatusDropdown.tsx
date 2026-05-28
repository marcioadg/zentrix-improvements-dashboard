import React, { useState } from 'react';
import { Check, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface CompanyStatusDropdownProps {
  companyId: string;
  currentStatus: 'Active' | 'Working' | 'Stuck';
  onStatusChange?: () => void;
}

const STATUS_CONFIG = {
  Active: {
    label: 'Active',
    icon: CheckCircle2,
    bgClass: 'bg-gradient-to-br from-emerald-100 to-teal-200 dark:from-emerald-950 dark:to-teal-900',
    textClass: 'text-emerald-700 dark:text-emerald-200',
    hoverClass: 'hover:shadow-emerald-500/20 hover:shadow-lg hover:scale-105',
    borderClass: 'border-emerald-200 dark:border-emerald-800'
  },
  Working: {
    label: 'Working',
    icon: Clock,
    bgClass: 'bg-gradient-to-br from-amber-100 to-orange-200 dark:from-amber-950 dark:to-orange-900',
    textClass: 'text-amber-700 dark:text-amber-200',
    hoverClass: 'hover:shadow-amber-500/20 hover:shadow-lg hover:scale-105',
    borderClass: 'border-amber-200 dark:border-amber-800'
  },
  Stuck: {
    label: 'Stuck',
    icon: AlertTriangle,
    bgClass: 'bg-gradient-to-br from-rose-100 to-red-200 dark:from-rose-950 dark:to-red-900',
    textClass: 'text-rose-700 dark:text-rose-200',
    hoverClass: 'hover:shadow-rose-500/20 hover:shadow-lg hover:scale-105',
    borderClass: 'border-rose-200 dark:border-rose-800'
  }
};

export const CompanyStatusDropdown: React.FC<CompanyStatusDropdownProps> = ({
  companyId,
  currentStatus,
  onStatusChange
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleStatusChange = async (newStatus: 'Active' | 'Working' | 'Stuck', e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (newStatus === currentStatus) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({ status: newStatus })
        .eq('id', companyId);

      if (error) throw error;

      logger.log(`Updated company ${companyId} status to ${newStatus}`);
      onStatusChange?.();
    } catch (error) {
      logger.error('Error updating company status:', error);
      toast({
        title: "Error",
        description: "Failed to update company status",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const currentConfig = STATUS_CONFIG[currentStatus];
  const StatusIcon = currentConfig.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`${currentConfig.bgClass} ${currentConfig.textClass} ${currentConfig.hoverClass} px-3 h-7 font-medium text-xs rounded-full border transition-all duration-200 ${currentConfig.borderClass} inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1`}
          onClick={(e) => e.stopPropagation()}
          disabled={isUpdating}
        >
          <StatusIcon className="h-3 w-3" />
          {currentStatus}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="start" 
        className="w-40 bg-popover z-50 border shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {(Object.keys(STATUS_CONFIG) as Array<'Active' | 'Working' | 'Stuck'>).map((status) => {
          const config = STATUS_CONFIG[status];
          const MenuIcon = config.icon;
          const isSelected = status === currentStatus;
          
          return (
            <DropdownMenuItem
              key={status}
              onClick={(e) => handleStatusChange(status, e)}
              className={`${config.textClass} ${config.hoverClass} cursor-pointer flex items-center gap-2 justify-between rounded-md transition-all duration-150`}
            >
              <div className="flex items-center gap-2">
                <MenuIcon className="h-3.5 w-3.5" />
                <span>{config.label}</span>
              </div>
              {isSelected && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};