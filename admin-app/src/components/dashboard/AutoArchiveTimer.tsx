
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Undo, Archive } from 'lucide-react';

export interface PendingArchiveTask {
  taskId: string;
  title: string;
  timeLeft: number;
}

interface AutoArchiveTimerProps {
  pendingTasks: PendingArchiveTask[];
  onUndo: (taskId: string) => void;
}

export const AutoArchiveTimer: React.FC<AutoArchiveTimerProps> = ({
  pendingTasks,
  onUndo
}) => {
  if (pendingTasks.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 space-y-2 z-50">
      {pendingTasks.map((task) => (
        <Card key={task.taskId} className="w-80 bg-background shadow-lg border-warning/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Archive className="h-4 w-4 text-warning" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {task.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {task.timeLeft === 0 ? 'Archiving now...' : `Archiving in ${task.timeLeft}s`}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onUndo(task.taskId)}
                className="flex-shrink-0"
              >
                <Undo className="h-3 w-3 mr-1" />
                Undo
              </Button>
            </div>
            <Progress 
              value={((5 - task.timeLeft) / 5) * 100} 
              className="mt-2 h-1"
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
