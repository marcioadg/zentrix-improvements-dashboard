import React, { createContext, useContext, useState } from 'react';

interface ToolsContextType {
  activeTool: string;
  setActiveTool: (tool: string) => void;
}

const ToolsContext = createContext<ToolsContextType | undefined>(undefined);

export const ToolsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTool, setActiveTool] = useState('delegate-elevate');

  return (
    <ToolsContext.Provider value={{ activeTool, setActiveTool }}>
      {children}
    </ToolsContext.Provider>
  );
};

export const useTools = () => {
  const context = useContext(ToolsContext);
  return context || null;
};
