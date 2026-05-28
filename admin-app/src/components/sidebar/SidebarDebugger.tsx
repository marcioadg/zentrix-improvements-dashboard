import React, { useEffect } from 'react';
import { useSidebar } from '@/components/ui/sidebar';
import { logger } from '@/utils/logger';
export const SidebarDebugger: React.FC = () => {
  const {
    state,
    open,
    isMobile,
    openMobile
  } = useSidebar();
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      logger.log('🔧 Sidebar state change:', {
        state,
        open,
        isMobile,
        openMobile,
        timestamp: new Date().toISOString()
      });
    }
  }, [state, open, isMobile, openMobile]);

  // Don't render anything in production
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  return;
};