import React, { useState } from 'react';
import DelegateElevateGrid from '@/components/tools/DelegateElevate/DelegateElevateGrid';
import ClarityBreakView from '@/components/tools/ClarityBreak/ClarityBreakView';
import ClarityBreakHistory from '@/components/tools/ClarityBreak/ClarityBreakHistory';
import DeepStrategyView from '@/components/tools/DeepStrategy/DeepStrategyView';
import MarketingStrategyView from '@/components/tools/MarketingStrategy/MarketingStrategyView';
import OfferBuilderView from '@/components/tools/OfferBuilder/OfferBuilderView';
import EOSLifeView from '@/components/tools/EOSLife/EOSLifeView';
import ReplacementLadderView from '@/components/tools/ReplacementLadder/ReplacementLadderView';

import { useClarityBreaks } from '@/hooks/useClarityBreaks';
interface ToolConfig {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType;
  showHistory?: boolean;
}

const tools: Record<string, ToolConfig> = {
  'delegate-elevate': {
    id: 'delegate-elevate',
    title: 'Delegate & Elevate',
    description: 'Organize your tasks by how much you love them and how good you are at them',
    component: DelegateElevateGrid,
  },
  'clarity-break': {
    id: 'clarity-break',
    title: 'Clarity Break Journal',
    description: 'Reflect, solve, and gain insight with guided clarity breaks',
    component: ClarityBreakView,
    showHistory: true,
  },
  'deep-strategy': {
    id: 'deep-strategy',
    title: 'Deep Strategy',
    description: 'Diagnose and sharpen your business strategy based on your current stage',
    component: DeepStrategyView,
  },
  'marketing-strategy': {
    id: 'marketing-strategy',
    title: 'Marketing Strategy',
    description: 'Build your lead generation machine using the $100M Leads framework',
    component: MarketingStrategyView,
  },
  'the-offer': {
    id: 'the-offer',
    title: 'The Offer',
    description: 'Create your Grand Slam Offer using Alex Hormozi\'s $100M Offers framework',
    component: OfferBuilderView,
  },
  'eos-life': {
    id: 'eos-life',
    title: 'EOS Life',
    description: 'Track and balance the 5 core areas of your life for fulfillment',
    component: EOSLifeView,
  },
  'replacement-ladder': {
    id: 'replacement-ladder',
    title: 'Replacement Ladder',
    description: 'Plan your succession and talent development strategy',
    component: ReplacementLadderView,
  },
};

export const ToolsContent = ({ activeTool, onToolSelect }: { activeTool?: string; onToolSelect?: (toolId: string) => void }) => {
  const [internalActiveTool, setInternalActiveTool] = useState('delegate-elevate');
  const clarityBreaksHook = useClarityBreaks();
  
  const currentActiveTool = activeTool || internalActiveTool;
  const handleToolSelect = onToolSelect || setInternalActiveTool;
  
  const currentTool = tools[currentActiveTool];
  const ToolComponent = currentTool?.component;

  if (!currentTool || !ToolComponent) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Tool not found</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="flex-shrink-0 border-b border-border bg-muted/30 px-6 py-4">
        <h2 className="text-2xl font-semibold text-foreground mb-1">
          {currentTool.title}
        </h2>
        <p className="text-sm text-muted-foreground max-w-2xl">
          {currentTool.description}
        </p>
      </div>
      
      <div className="flex-1 overflow-auto bg-background">
        <div className="container max-w-none p-6">
          {currentTool.id === 'clarity-break' ? (
            <div className="space-y-8">
              <ClarityBreakView clarityBreaksHook={clarityBreaksHook} />
              <ClarityBreakHistory clarityBreaksHook={clarityBreaksHook} />
            </div>
          ) : (
            <ToolComponent />
          )}
        </div>
      </div>
    </div>
  );
};