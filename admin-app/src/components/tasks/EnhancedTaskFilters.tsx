import React from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Search, Users, CheckCircle2, Clock } from 'lucide-react';
import { ArchiveToggle } from '@/components/goals/ArchiveToggle';
import { TeamFilterDropdown } from './TeamFilterDropdown';

interface Team {
  id: string;
  name: string;
}

interface EnhancedTaskFiltersProps {
  filter: 'all' | 'active' | 'completed' | 'personal' | 'team';
  onFilterChange: (filter: 'all' | 'active' | 'completed' | 'personal' | 'team') => void;
  taskCounts: {
    total: number;
    active: number;
    completed: number;
    personal: number;
    team: number;
  };
  onClearCompleted: () => void;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  showOnlyMyTasks?: boolean;
  onToggleMyTasks?: (show: boolean) => void;
  showArchived?: boolean;
  onToggleArchived?: (show: boolean) => void;
  teams?: Team[];
  selectedTeamId?: string | 'all' | 'personal';
  onTeamSelect?: (teamId: string | 'all' | 'personal') => void;
  teamTaskCounts?: Record<string, number>;
  personalTaskCount?: number;
}

export const EnhancedTaskFilters: React.FC<EnhancedTaskFiltersProps> = ({
  filter,
  onFilterChange,
  taskCounts,
  onClearCompleted,
  searchTerm = '',
  onSearchChange,
  showOnlyMyTasks = true,
  onToggleMyTasks,
  showArchived = false,
  onToggleArchived,
  teams = [],
  selectedTeamId = 'all',
  onTeamSelect,
  teamTaskCounts = {},
  personalTaskCount = 0,
}) => {
  return (
    <div className="flex items-center gap-3">
      {/* Team filter dropdown */}
      {teams.length > 0 && onTeamSelect ? (
        <TeamFilterDropdown
          teams={teams}
          selectedTeamId={selectedTeamId}
          onTeamSelect={onTeamSelect}
          taskCount={taskCounts.team}
          isActive={filter === 'team' || filter === 'personal'}
          teamTaskCounts={teamTaskCounts}
          onFilterChange={() => {
            if (filter !== 'team' && filter !== 'personal') {
              onFilterChange('team');
            }
          }}
          personalTaskCount={personalTaskCount}
        />
      ) : (
        <button
          onClick={() => onFilterChange('team')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-[4px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
            filter === 'team'
              ? 'bg-[var(--active)] text-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          Team ({taskCounts.team})
        </button>
      )}

      <button
        onClick={() => onFilterChange('active')}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-[4px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
          filter === 'active'
            ? 'bg-[var(--active)] text-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        }`}
      >
        <Clock className="h-3.5 w-3.5" />
        Active ({taskCounts.active})
      </button>

      <button
        onClick={() => onFilterChange('completed')}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-[4px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
          filter === 'completed'
            ? 'bg-[var(--active)] text-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        }`}
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        Done
      </button>

      {/* Search */}
      {onSearchChange && (
        <div className="relative w-40">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-8 w-full rounded-[6px] bg-transparent border border-border text-[13px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary px-3 text-foreground placeholder:text-muted-foreground"
          />
        </div>
      )}

      <div className="flex-1" />

      {/* Clear Completed Button - Only show when "Done" tab is active */}
      {taskCounts.completed > 0 && filter === 'completed' && (
        <Button
          variant="outline"
          size="sm"
          onClick={onClearCompleted}
          className="text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors"
        >
          Clear Done
        </Button>
      )}

      {/* Archive Toggle */}
      {onToggleArchived && (
        <ArchiveToggle
          showArchived={showArchived}
          onToggle={onToggleArchived}
        />
      )}

      {/* Show Only My Tasks Toggle */}
      {onToggleMyTasks && (
        <div className="flex items-center space-x-2">
          <Label htmlFor="my-tasks-only" className="text-sm font-medium">
            Only my tasks
          </Label>
          <Switch
            id="my-tasks-only"
            checked={showOnlyMyTasks}
            onCheckedChange={onToggleMyTasks}
          />
        </div>
      )}
    </div>
  );
};