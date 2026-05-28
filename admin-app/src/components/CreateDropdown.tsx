
import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Target, CheckSquare, TrendingUp, Newspaper, AlertCircle } from 'lucide-react';
import { logger } from '@/utils/logger';

interface CreateDropdownProps {
  onCreateTask: () => void;
  onCreateGoal: () => void;
  onCreateMetric: () => void;
  onCreateHeadline: () => void;
  onCreateIssue?: () => void;
  selectedTeamIds?: string[];
}

export const CreateDropdown: React.FC<CreateDropdownProps> = ({
  onCreateTask,
  onCreateGoal,
  onCreateMetric,
  onCreateHeadline,
  onCreateIssue,
  selectedTeamIds,
}) => {
  const handleCreateTask = () => {
    logger.log('🔧 CreateDropdown: Task creation clicked');
    onCreateTask();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost"
          size="sm"
          className="h-10 px-3 hover:bg-muted/50 border border-border/50 hover:border-border flex items-center gap-2"
          title="Create Item"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Create</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-background border shadow-lg z-50">
        {onCreateIssue && (
          <DropdownMenuItem onClick={onCreateIssue} className="cursor-pointer">
            <AlertCircle className="h-4 w-4 mr-2" />
            Issue
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={handleCreateTask} className="cursor-pointer">
          <CheckSquare className="h-4 w-4 mr-2" />
          Task
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onCreateHeadline} className="cursor-pointer">
          <Newspaper className="h-4 w-4 mr-2" />
          Headline
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onCreateGoal} className="cursor-pointer">
          <Target className="h-4 w-4 mr-2" />
          Goal
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onCreateMetric} className="cursor-pointer">
          <TrendingUp className="h-4 w-4 mr-2" />
          Metric
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
