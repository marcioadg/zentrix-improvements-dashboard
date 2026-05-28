import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

interface NavigationTransitionState {
  isTransitioning: boolean;
  fromRoute: string | null;
  toRoute: string | null;
}

interface NavigationTransitionContextType extends NavigationTransitionState {
  startTransition: (fromRoute: string, toRoute: string) => void;
  endTransition: () => void;
}

const NavigationTransitionContext = createContext<NavigationTransitionContextType | undefined>(undefined);

export const useNavigationTransition = () => {
  const context = useContext(NavigationTransitionContext);
  if (!context) {
    throw new Error('useNavigationTransition must be used within NavigationTransitionProvider');
  }
  return context;
};

export const NavigationTransitionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<NavigationTransitionState>({
    isTransitioning: false,
    fromRoute: null,
    toRoute: null
  });

  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  const startTransition = useCallback((fromRoute: string, toRoute: string) => {
    setState({
      isTransitioning: true,
      fromRoute,
      toRoute
    });

    // Extended transition protection for meeting end scenarios (8 seconds to allow all operations to complete)
    const isFromMeeting = fromRoute.includes('/meeting') || fromRoute.includes('/team/');
    const transitionDuration = isFromMeeting ? 8000 : 3000;

    // Clear any pending transition timer before starting a new one
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
    }

    transitionTimerRef.current = setTimeout(() => {
      setState(prev => {
        if (prev.isTransitioning) {
          return { isTransitioning: false, fromRoute: null, toRoute: null };
        }
        return prev;
      });
      transitionTimerRef.current = null;
    }, transitionDuration);
  }, []);

  const endTransition = useCallback(() => {
    setState({
      isTransitioning: false,
      fromRoute: null,
      toRoute: null
    });
  }, []);

  const value = {
    ...state,
    startTransition,
    endTransition
  };

  return (
    <NavigationTransitionContext.Provider value={value}>
      {children}
    </NavigationTransitionContext.Provider>
  );
};
