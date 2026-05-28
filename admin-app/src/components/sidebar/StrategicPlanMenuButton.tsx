/**
 * Isolated Strategic Plan Menu Button — normalized to match all other nav items
 */

import React, { memo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStrategicPlanAccess } from '@/hooks/useStrategicPlanAccess';
import { SidebarMenuButton } from '@/components/ui/sidebar';

const StrategicPlanMenuButtonInner: React.FC = () => {
  const location = useLocation();
  const { shouldShowStrategyPage, loading, error } = useStrategicPlanAccess();
  
  const isActive = location.pathname === '/strategy';
  const baseClass = "h-8 text-[13px] font-medium transition-colors duration-150 px-2 py-1.5 gap-2 rounded-[4px]";

  if (error || loading || !shouldShowStrategyPage) {
    return (
      <SidebarMenuButton
        size="default"
        className={cn(baseClass, "opacity-40 cursor-not-allowed pointer-events-none text-muted-foreground")}
        disabled
      >
        <Rocket className="h-4 w-4 stroke-[1.5]" />
        <span>Strategy</span>
      </SidebarMenuButton>
    );
  }

  return (
    <SidebarMenuButton
      asChild
      isActive={isActive}
      size="default"
      className={cn(
        baseClass,
        isActive
          ? "bg-state-active text-foreground font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-state-hover"
      )}
    >
      <Link to="/strategy" className="flex items-center gap-2">
        <Rocket className="h-4 w-4 stroke-[1.5] transition-colors duration-150" />
        <span>Strategy</span>
      </Link>
    </SidebarMenuButton>
  );
};

export const StrategicPlanMenuButton = memo(StrategicPlanMenuButtonInner);
StrategicPlanMenuButton.displayName = 'StrategicPlanMenuButton';
