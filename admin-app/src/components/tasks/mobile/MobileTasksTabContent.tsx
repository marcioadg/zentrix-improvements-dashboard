import React from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { MobileTaskList } from '../MobileTaskList';
import type { FastTask } from '@/hooks/useFastTasks';

interface TeamInfo {
  id: string;
  name: string;
  company_id: string;
}

interface MobileTasksTabContentProps {
  activeTab: string;
  filteredTasks: {
    todo: FastTask[];
    inprogress: FastTask[];
    done: FastTask[];
  };
  teams: TeamInfo[];
  onStatusChange: (taskId: string, status: 'todo' | 'in-progress' | 'done') => Promise<void>;
  onArchive: (taskId: string) => Promise<void>;
  onUpdateTask?: (taskId: string, updates: Partial<FastTask>) => Promise<void>;
}

export const MobileTasksTabContent: React.FC<MobileTasksTabContentProps> = ({
  activeTab,
  filteredTasks,
  teams,
  onStatusChange,
  onArchive,
  onUpdateTask,
}) => {
  const getEmptyMessage = (tab: string) => {
    switch (tab) {
      case 'todo': return 'No pending tasks';
      case 'inprogress': return 'No tasks in progress';
      case 'done': return 'No completed tasks';
      default: return 'No tasks found';
    }
  };

  return (
    <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
      <TabsContent value="todo" className="mt-0">
        <MobileTaskList
          tasks={filteredTasks.todo}
          onStatusChange={onStatusChange}
          onArchive={onArchive}
          onUpdateTask={onUpdateTask}
          teams={teams}
          emptyMessage={getEmptyMessage('todo')}
        />
      </TabsContent>

      <TabsContent value="inprogress" className="mt-0">
        <MobileTaskList
          tasks={filteredTasks.inprogress}
          onStatusChange={onStatusChange}
          onArchive={onArchive}
          onUpdateTask={onUpdateTask}
          teams={teams}
          emptyMessage={getEmptyMessage('inprogress')}
        />
      </TabsContent>

      <TabsContent value="done" className="mt-0">
        <MobileTaskList
          tasks={filteredTasks.done}
          onStatusChange={onStatusChange}
          onArchive={onArchive}
          onUpdateTask={onUpdateTask}
          teams={teams}
          emptyMessage={getEmptyMessage('done')}
        />
      </TabsContent>
    </div>
  );
};