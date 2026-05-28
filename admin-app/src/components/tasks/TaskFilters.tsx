
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface TaskFiltersProps {
  filter: 'all' | 'active' | 'completed';
  onFilterChange: (filter: 'all' | 'active' | 'completed') => void;
  taskCounts: {
    total: number;
    active: number;
    completed: number;
  };
  onClearCompleted: () => void;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
}

export const TaskFilters: React.FC<TaskFiltersProps> = ({
  filter,
  onFilterChange,
  taskCounts,
  onClearCompleted,
  searchTerm = '',
  onSearchChange,
}) => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col gap-4">
          {/* Search Bar */}
          {onSearchChange && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search tasks..."
                className="pl-10"
              />
            </div>
          )}

          {/* Filter Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button 
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onFilterChange('all')}
              >
                All Tasks
                <Badge variant="secondary" className="ml-2">
                  {taskCounts.total}
                </Badge>
              </Button>
              
              <Button 
                variant={filter === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onFilterChange('active')}
              >
                Active
                <Badge variant="secondary" className="ml-2">
                  {taskCounts.active}
                </Badge>
              </Button>
              
              <Button 
                variant={filter === 'completed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onFilterChange('completed')}
              >
                Completed
                <Badge variant="secondary" className="ml-2">
                  {taskCounts.completed}
                </Badge>
              </Button>
            </div>
            
            {taskCounts.completed > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={onClearCompleted}
              >
                Clear Completed
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
