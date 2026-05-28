
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Camera } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  description?: string;
}

interface TaskCount {
  id: string;
  totalCount: number;
}

interface TaskFilterPreferences {
  sortBy: 'due_date' | 'created_at';
  sortOrder: 'asc' | 'desc';
  showArchived: boolean;
  myTasksOnly: boolean;
}

interface TasksPageHeaderProps {
  teams: Team[];
  transformedTaskCounts: TaskCount[];
  selectedTeamIds: string[];
  filterPreferences: TaskFilterPreferences;
  settings?: {
    showArchived: boolean;
    showCompleted: boolean;
  };
  viewMode: 'kanban' | 'list';
  onSelectionChange: (teamIds: string[]) => void;
  onUpdatePreferences: (preferences: Partial<TaskFilterPreferences>) => void;
  onUpdateSettings?: (settings: any) => void;
  onViewModeChange: (mode: 'kanban' | 'list') => void;
  onCameraClick: () => void;
}

export const TasksPageHeader: React.FC<TasksPageHeaderProps> = ({
  teams,
  transformedTaskCounts,
  selectedTeamIds,
  filterPreferences,
  viewMode,
  onSelectionChange,
  onUpdatePreferences,
  onViewModeChange,
  onCameraClick
}) => {
  const handleTeamSelection = (teamId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedTeamIds, teamId]);
    } else {
      onSelectionChange(selectedTeamIds.filter(id => id !== teamId));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-foreground">Tasks</h1>
          <p className="text-[13px] text-muted-foreground">
            Manage your active tasks across teams and projects
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCameraClick}
            className="gap-2"
          >
            <Camera className="h-4 w-4" />
            Camera
          </Button>
          
          <Select value={viewMode} onValueChange={(value: 'kanban' | 'list') => onViewModeChange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="list">List View</SelectItem>
              <SelectItem value="kanban">Kanban</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Team Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="personal"
                checked={selectedTeamIds.includes('personal')}
                onCheckedChange={(checked) => handleTeamSelection('personal', checked as boolean)}
              />
              <label htmlFor="personal" className="text-sm font-medium">
                Personal Tasks
                <Badge variant="secondary" className="ml-2">
                  {transformedTaskCounts.find(tc => tc.id === 'personal')?.totalCount || 0}
                </Badge>
              </label>
            </div>
            
            {teams.map(team => (
              <div key={team.id} className="flex items-center space-x-2">
                <Checkbox
                  id={team.id}
                  checked={selectedTeamIds.includes(team.id)}
                  onCheckedChange={(checked) => handleTeamSelection(team.id, checked as boolean)}
                />
                <label htmlFor={team.id} className="text-sm font-medium">
                  {team.name}
                  <Badge variant="secondary" className="ml-2">
                    {transformedTaskCounts.find(tc => tc.id === team.id)?.totalCount || 0}
                  </Badge>
                </label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
