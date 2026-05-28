import React, { createContext, useContext, useState, useEffect } from 'react';

interface AppLoadingContextType {
  isAppShellLoaded: boolean;
  setAppShellLoaded: (loaded: boolean) => void;
}

const AppLoadingContext = createContext<AppLoadingContextType | undefined>(undefined);

export const useAppLoading = () => {
  const context = useContext(AppLoadingContext);
  if (!context) {
    throw new Error('useAppLoading must be used within AppLoadingProvider');
  }
  return context;
};

export const AppLoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAppShellLoaded, setIsAppShellLoaded] = useState(false);

  // Mark app shell as loaded after a short delay to ensure initial render
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAppShellLoaded(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const setAppShellLoaded = (loaded: boolean) => {
    setIsAppShellLoaded(loaded);
  };

  return (
    <AppLoadingContext.Provider value={{ isAppShellLoaded, setAppShellLoaded }}>
      {children}
    </AppLoadingContext.Provider>
  );
};