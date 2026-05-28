import React, { useState, lazy, Suspense } from 'react';
import { GitBranch, Compass, BarChart3, Search, ChevronDown, Wrench } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useCurrentUserPermissionLevel } from '@/hooks/useUserPermissionLevel';
import { Skeleton } from '@/components/ui/skeleton';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { SimpleStrategyProvider } from '@/contexts/SimpleStrategyContext';
import { onboardingStepsData } from '@/components/dashboard/OnboardingStepsData';

// Lazy load the page components
const OrgChart = lazy(() => import('@/pages/OrgChart'));
const Strategy = lazy(() => import('@/pages/Strategy'));
const Analytics = lazy(() => import('@/pages/Analytics'));
const AnalyzerTab = lazy(() => import('@/components/people/tabs/AnalyzerTab').then(m => ({ default: m.AnalyzerTab })));

type PanelType = 'org-chart' | 'strategy' | 'analytics' | 'analyzer' | null;

const LoadingFallback = () => (
  <div className="p-6 space-y-4">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-64 w-full" />
    <Skeleton className="h-32 w-full" />
  </div>
);

export const MeetingToolsDropdown: React.FC = () => {
  const { hasManagerAccess } = useCurrentUserPermissionLevel();
  const [activePanel, setActivePanel] = useState<PanelType>(null);

  const handleOpenPanel = (panel: PanelType) => {
    setActivePanel(panel);
  };

  const getPanelTitle = () => {
    switch (activePanel) {
      case 'org-chart': return 'Org Chart';
      case 'strategy': return 'Strategy';
      case 'analytics': return 'Analytics';
      case 'analyzer': return 'Analyzer';
      default: return '';
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground hover:text-foreground">
            <Wrench className="h-4 w-4" />
            <span className="hidden sm:inline">Tools</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44 bg-popover border border-border">
          <DropdownMenuItem 
            onClick={() => handleOpenPanel('org-chart')}
            className="cursor-pointer gap-2"
          >
            <GitBranch className="h-4 w-4" />
            Org Chart
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleOpenPanel('strategy')}
            className="cursor-pointer gap-2"
          >
            <Compass className="h-4 w-4" />
            Strategy
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleOpenPanel('analytics')}
            className="cursor-pointer gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Analytics
          </DropdownMenuItem>
          {hasManagerAccess && (
            <DropdownMenuItem 
              onClick={() => handleOpenPanel('analyzer')}
              className="cursor-pointer gap-2"
            >
              <Search className="h-4 w-4" />
              Analyzer
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Sheet open={!!activePanel} onOpenChange={(open) => !open && setActivePanel(null)}>
        <SheetContent 
          side="right" 
          className="w-full sm:max-w-none p-0 overflow-hidden z-40"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <SheetHeader className="px-6 py-4 border-b border-border">
            <SheetTitle>{getPanelTitle()}</SheetTitle>
          </SheetHeader>
          <div className="h-[calc(100vh-80px)] overflow-y-auto">
            <Suspense fallback={<LoadingFallback />}>
              {activePanel === 'org-chart' && (
                <OnboardingProvider initialSteps={onboardingStepsData}>
                  <OrgChart />
                </OnboardingProvider>
              )}
              {activePanel === 'strategy' && (
                <div className="px-6 py-4">
                  <Strategy />
                </div>
              )}
              {activePanel === 'analytics' && <Analytics />}
              {activePanel === 'analyzer' && (
                <SimpleStrategyProvider teamId={null}>
                  <AnalyzerTab />
                </SimpleStrategyProvider>
              )}
            </Suspense>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
