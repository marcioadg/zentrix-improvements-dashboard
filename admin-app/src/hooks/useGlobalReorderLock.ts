import { useRef, useEffect, useCallback } from 'react';
import { logger } from '@/utils/logger';

// Global state to coordinate reordering across team instances - now scoped by section
class GlobalReorderCoordinator {
  private reorderingSections = new Set<string>();
  private listeners = new Set<() => void>();

  setGlobalReordering(reordering: boolean, sectionId?: string) {
    if (sectionId) {
      if (reordering) {
        this.reorderingSections.add(sectionId);
      } else {
        this.reorderingSections.delete(sectionId);
      }
    } else {
      // Legacy global mode - affects all sections
      if (reordering) {
        this.reorderingSections.add('*global*');
      } else {
        this.reorderingSections.delete('*global*');
      }
    }
    // Notify all listeners about the state change
    this.listeners.forEach(callback => callback());
  }

  isGloballyReordering(): boolean {
    return this.reorderingSections.has('*global*') || this.reorderingSections.size > 0;
  }

  isSectionReordering(sectionId: string): boolean {
    return this.reorderingSections.has('*global*') || this.reorderingSections.has(sectionId);
  }

  addListener(callback: () => void) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }
}

// Global singleton instance
const globalReorderCoordinator = new GlobalReorderCoordinator();

export const useGlobalReorderLock = () => {
  const forceUpdateRef = useRef(0);
  const forceUpdate = useCallback(() => {
    forceUpdateRef.current += 1;
  }, []);

  // Listen to global reordering state changes
  useEffect(() => {
    const removeListener = globalReorderCoordinator.addListener(forceUpdate);
    return removeListener; // This is already the cleanup function
  }, [forceUpdate]);

  const setGlobalReordering = useCallback((reordering: boolean, sectionId?: string) => {
    logger.log(`🔒 ${sectionId ? `Section "${sectionId}"` : 'Global'} reorder lock: ${reordering ? 'LOCKED' : 'UNLOCKED'}`);
    globalReorderCoordinator.setGlobalReordering(reordering, sectionId);
  }, []);

  const isSectionReordering = useCallback((sectionId: string) => {
    return globalReorderCoordinator.isSectionReordering(sectionId);
  }, [forceUpdateRef.current]);

  const isGloballyReordering = useCallback(() => {
    return globalReorderCoordinator.isGloballyReordering();
  }, [forceUpdateRef.current]); // Force re-evaluation when state changes

  return {
    setGlobalReordering,
    isGloballyReordering,
    isSectionReordering
  };
};