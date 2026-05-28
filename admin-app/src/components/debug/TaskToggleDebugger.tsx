import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { FastTask } from '@/hooks/useFastTasks';
import { useProfile } from '@/hooks/useProfile';
import { logger } from '@/utils/logger';
interface TaskToggleDebuggerProps {
  tasks: FastTask[];
  onToggleTask: (id: string) => void;
}
export const TaskToggleDebugger: React.FC<TaskToggleDebuggerProps> = ({
  tasks,
  onToggleTask
}) => {
  const [lastOperation, setLastOperation] = useState<{
    taskId: string;
    operation: string;
    timestamp: string;
    success: boolean;
    error?: string;
  } | null>(null);
  const {
    profile
  } = useProfile();
  const handleTestToggle = async (task: FastTask) => {
    const timestamp = new Date().toISOString();
    logger.log('🧪 TaskToggleDebugger: Testing toggle', {
      taskId: task.id,
      currentStatus: task.status,
      timestamp
    });
    try {
      await onToggleTask(task.id);
      setLastOperation({
        taskId: task.id,
        operation: `Toggle from ${task.status}`,
        timestamp,
        success: true
      });
    } catch (error) {
      setLastOperation({
        taskId: task.id,
        operation: `Toggle from ${task.status}`,
        timestamp,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  return <Card className="mb-4 border-yellow-200 bg-warning/5">
      
      
    </Card>;
};