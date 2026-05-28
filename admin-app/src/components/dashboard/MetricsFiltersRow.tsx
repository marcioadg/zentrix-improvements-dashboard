import React, { useState } from 'react';
import { TeamSelector } from '@/components/shared/TeamSelector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings, Search, MoreVertical, FileDown, SlidersHorizontal, Eye, EyeOff } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { TimePeriodSelector } from '@/components/dashboard/TimePeriodSelector';
import { MetricsSettingsContent } from '@/components/dashboard/MetricsSettingsContent';
import { MetricsPeriodSelector } from '@/components/dashboard/MetricsPeriodSelector';
import { OwnerFilter } from '@/components/dashboard/OwnerFilter';
import { MetricsExportButton } from '@/components/dashboard/MetricsExportButton';
import { WeeklyMetricWithOwner } from '@/types/weeklyMetrics';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { logger } from '@/utils/logger';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
interface MetricsFiltersRowProps {
  teams: any[];
  selectedTeam: string;
  onTeamSelect: (teamId: string) => void;
  timePeriod: string;
  onTimePeriodChange: (period: string) => void;
  customDateRange?: {
    start: Date;
    end: Date;
  } | null;
  onDateRangeChange: (range: {
    start: Date;
    end: Date;
  } | null) => void;
  periodGrouping: string;
  onPeriodGroupingChange: (grouping: string) => void;
  userSettings: any;
  onSettingsUpdate: (settings: any) => Promise<void>;
  onWeekStartDayChange?: (weekStartDay: 'monday' | 'sunday') => Promise<boolean>;
  settingsLoading: boolean;
  onOpenMetricManagement: () => void;
  metrics: WeeklyMetricWithOwner[];
  selectedOwnerId: string;
  onOwnerChange: (ownerId: string) => void;
  // Export props
  teamName: string;
  weekStarts: string[];
  formatWeekDate: (date: string) => string;
  formatValue: (value: number | null, unit: string, addSuffix?: boolean) => string;
  getValueColor: (value: number | null, targetValue: number | null, targetLogic: string | null, customTarget?: any) => string;
  // Search props
  searchText: string;
  onSearchChange: (text: string) => void;
  // Archived props
  showArchived?: boolean;
  onShowArchivedChange?: (show: boolean) => void;
  archivedCount?: number;
}
export const MetricsFiltersRow: React.FC<MetricsFiltersRowProps> = ({
  teams,
  selectedTeam,
  onTeamSelect,
  timePeriod,
  onTimePeriodChange,
  customDateRange,
  onDateRangeChange,
  periodGrouping,
  onPeriodGroupingChange,
  userSettings,
  onSettingsUpdate,
  onWeekStartDayChange,
  settingsLoading,
  onOpenMetricManagement,
  metrics,
  selectedOwnerId,
  onOwnerChange,
  teamName,
  weekStarts,
  formatWeekDate,
  formatValue,
    getValueColor,
    searchText,
    onSearchChange,
    showArchived = false,
    onShowArchivedChange,
    archivedCount = 0
}) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const handleShowCurrentWeekChange = async (show: boolean) => {
    await onSettingsUpdate({
      show_current_week: show
    });
  };
  const handleHighlightCurrentWeekChange = async (highlight: boolean) => {
    await onSettingsUpdate({
      highlight_current_week: highlight
    });
  };

  const handleWeekStartDayChange = async (weekStartDay: 'monday' | 'sunday') => {
    logger.log('🎯 MetricsFiltersRow: handleWeekStartDayChange called with:', weekStartDay);
    logger.log('🎯 onWeekStartDayChange handler available:', !!onWeekStartDayChange);
    
    if (onWeekStartDayChange) {
      logger.log('🚀 Using migration handler');
      // Use migration handler if provided
      const result = await onWeekStartDayChange(weekStartDay);
      logger.log('🔄 Migration handler result:', result);
    } else {
      logger.log('⚠️ Using fallback settings-only update');
      // Fallback to settings-only update
      await onSettingsUpdate({
        week_start_day: weekStartDay
      });
    }
  };
  return (
    <div className="border-b border-border/40 pb-4 mb-6">
      {/* Single row: all filters + search */}
      <div className="flex items-center gap-3 flex-wrap">
        <TeamSelector teams={teams} selectedTeamId={selectedTeam} onTeamChange={onTeamSelect} className="w-[160px] flex-shrink-0" />
        
        <TimePeriodSelector selectedPeriod={timePeriod} onPeriodChange={onTimePeriodChange} customDateRange={customDateRange} onDateRangeChange={onDateRangeChange} />
        
        <MetricsPeriodSelector selectedPeriod={periodGrouping} onPeriodChange={onPeriodGroupingChange} />

        <OwnerFilter 
          metrics={metrics} 
          selectedOwnerId={selectedOwnerId} 
          onOwnerChange={onOwnerChange}
          loading={settingsLoading}
        />

        {/* Search — compact, after filters */}
        <div className="relative w-36 flex-shrink-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search..."
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-8 text-[13px] w-full"
          />
        </div>
        
        <div className="flex items-center gap-1 ml-auto">

        {/* Show/Hide Archived Toggle */}
        {onShowArchivedChange && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onShowArchivedChange(!showArchived)}
                className={`flex items-center gap-1.5 px-2 text-muted-foreground hover:text-foreground h-10 ${
                  showArchived ? 'text-foreground' : ''
                }`}
                aria-label={showArchived ? 'Hide archived metrics' : 'Show archived metrics'}
                aria-pressed={showArchived}
              >
                {showArchived ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipPrimitive.Portal>
              <TooltipContent side="bottom" align="center" className="z-[100]">
                <p className="text-xs">
                  {showArchived 
                    ? `Hide archived metrics${archivedCount > 0 ? ` (${archivedCount})` : ''}` 
                    : `Show archived metrics${archivedCount > 0 ? ` (${archivedCount})` : ''}`
                  }
                </p>
              </TooltipContent>
            </TooltipPrimitive.Portal>
          </Tooltip>
        )}

        {/* Three-dot dropdown menu */}
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-10 w-10 p-0" aria-label="More options">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-background z-50">
            <DropdownMenuItem 
              onSelect={(e) => { 
                e.preventDefault(); 
                setDropdownOpen(false);
                setSettingsOpen(true);
              }} 
              className="cursor-pointer"
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Settings
            </DropdownMenuItem>

            <DropdownMenuItem onClick={onOpenMetricManagement} className="cursor-pointer">
              <Settings className="h-4 w-4 mr-2" />
              Metric Management
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem 
              onSelect={(e) => {
                e.preventDefault();
                // Trigger export
                const exportBtn = document.querySelector('[data-export-pdf-trigger]') as HTMLButtonElement;
                if (exportBtn) exportBtn.click();
              }}
              className="cursor-pointer"
              disabled={settingsLoading || metrics.length === 0}
            >
              <FileDown className="h-4 w-4 mr-2" />
              Export PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Settings Dialog - outside dropdown */}
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent className="sm:max-w-md bg-card text-card-foreground">
            <DialogHeader>
              <DialogTitle>View Settings</DialogTitle>
            </DialogHeader>
            <MetricsSettingsContent 
              showCurrentWeek={userSettings?.show_current_week || false} 
              highlightCurrentWeek={userSettings?.highlight_current_week || false}
              weekStartDay={userSettings?.week_start_day || 'sunday'}
              onShowCurrentWeekChange={handleShowCurrentWeekChange} 
              onHighlightCurrentWeekChange={handleHighlightCurrentWeekChange}
              onWeekStartDayChange={handleWeekStartDayChange}
            />
          </DialogContent>
        </Dialog>

        {/* Hidden export button for triggering */}
        <div className="hidden">
          <MetricsExportButton
            metrics={metrics}
            teamName={teamName}
            weekStarts={weekStarts}
            formatWeekDate={formatWeekDate}
            formatValue={formatValue}
            getValueColor={getValueColor}
            loading={settingsLoading}
          />
        </div>
      </div>
      </div>
    </div>
  );
};