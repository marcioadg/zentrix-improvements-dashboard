
import { useState, useEffect, useMemo } from 'react';
import { TabConfig } from '@/components/people/tabs/DraggableTabs';
import { useCurrentUserPermissionLevel } from '@/hooks/useUserPermissionLevel';
import { logger } from '@/utils/logger';

const STORAGE_KEY = 'people-tabs-order';

const DEFAULT_TABS: TabConfig[] = [
  { id: 'people', value: 'people', label: 'People' },
  { id: 'analyzer', value: 'analyzer', label: 'Analyzer' },
  { id: 'teams', value: 'teams', label: 'Teams' },
];

export const useTabOrder = () => {
  const { permissionLevel } = useCurrentUserPermissionLevel();
  
  // Hide analyzer tab for member and view-only users
  const filteredDefaultTabs = useMemo(() => {
    return DEFAULT_TABS.filter(tab => {
      if (tab.id === 'analyzer') {
        return !['member', 'view-only'].includes(permissionLevel || '');
      }
      return true;
    });
  }, [permissionLevel]);
  
  const [tabs, setTabs] = useState<TabConfig[]>(filteredDefaultTabs);

  // Load tab order from localStorage on mount and filter based on permissions
  useEffect(() => {
    try {
      const savedOrder = localStorage.getItem(STORAGE_KEY);
      if (savedOrder) {
        const parsedOrder = JSON.parse(savedOrder);
        // Filter saved order based on current permissions
        const filteredSavedOrder = parsedOrder.filter((savedTab: TabConfig) => 
          filteredDefaultTabs.some(defaultTab => defaultTab.id === savedTab.id)
        );
        
        // Validate that all expected tabs are present
        const hasAllTabs = filteredDefaultTabs.every(defaultTab => 
          filteredSavedOrder.some((savedTab: TabConfig) => savedTab.id === defaultTab.id)
        );
        
        if (hasAllTabs && filteredSavedOrder.length === filteredDefaultTabs.length) {
          setTabs(filteredSavedOrder);
        } else {
          setTabs(filteredDefaultTabs);
        }
      } else {
        setTabs(filteredDefaultTabs);
      }
    } catch (error) {
      logger.error('Error loading tab order from localStorage:', error);
      // Fallback to filtered default order if there's an error
      setTabs(filteredDefaultTabs);
    }
  }, [filteredDefaultTabs]);

  const updateTabOrder = (newOrder: TabConfig[]) => {
    setTabs(newOrder);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrder));
    } catch (error) {
      logger.error('Error saving tab order to localStorage:', error);
    }
  };

  const resetToDefault = () => {
    setTabs(DEFAULT_TABS);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      logger.error('Error clearing tab order from localStorage:', error);
    }
  };

  return {
    tabs,
    updateTabOrder,
    resetToDefault,
  };
};
