import React from 'react';
import { ToolsContent } from './ToolsContent';
import { useTools } from '@/contexts/ToolsContext';

export const ToolsLayout = () => {
  const { activeTool, setActiveTool } = useTools();

  return (
    <ToolsContent activeTool={activeTool} onToolSelect={setActiveTool} />
  );
};