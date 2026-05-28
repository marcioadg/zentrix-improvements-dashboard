import { logger } from '@/utils/logger';

// Define the TeamTask interface locally since it's not exported from types
interface TeamTask {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  assigned_to?: string;
  due_date?: string;
  team_id: string;
  created_at: string;
  updated_at: string;
  archived: boolean;
}

export const getNewMeetingTasks = (
  tasks: TeamTask[],
  meetingStartTime: number | null,
  meetingId: string | null
): TeamTask[] => {
  // Reduce buffer to 30 seconds for more precision
  const timeBuffer = 30 * 1000; // 30 seconds in milliseconds

  if (!meetingStartTime) {
    logger.log('📊 WrapUpUtils: No meeting start time available, showing no tasks');
    return [];
  }

  const meetingStartTimeWithBuffer = meetingStartTime - timeBuffer;
  logger.log('📊 WrapUpUtils: Filtering tasks from useTeamTasks hook:', {
    meetingStartTime: new Date(meetingStartTime),
    meetingStartTimeWithBuffer: new Date(meetingStartTimeWithBuffer),
    totalTasksCount: tasks.length,
    meetingId,
    allTasks: tasks.map(t => ({
      id: t.id,
      title: t.title,
      createdAt: t.created_at,
      createdAtMs: new Date(t.created_at).getTime(),
      archived: t.archived
    }))
  });

  const newTasks = tasks.filter(task => {
    const taskCreatedAt = new Date(task.created_at).getTime();
    const isNewTask = taskCreatedAt >= meetingStartTimeWithBuffer && !task.archived;
    logger.log('📊 WrapUpUtils: Task filtering:', {
      title: task.title,
      createdAt: task.created_at,
      taskCreatedAtMs: taskCreatedAt,
      meetingStartWithBuffer: meetingStartTimeWithBuffer,
      isAfterStart: taskCreatedAt >= meetingStartTimeWithBuffer,
      isArchived: task.archived,
      isNewTask
    });
    return isNewTask;
  });

  logger.log('📊 WrapUpUtils: Final new tasks during meeting:', {
    count: newTasks.length,
    tasks: newTasks.map(t => ({
      id: t.id,
      title: t.title,
      createdAt: t.created_at
    }))
  });

  return newTasks;
};

export const getAdjustedCompletionStatus = (
  members: any[],
  absentMembers: Set<string>,
  ratingsSummary: any[]
) => {
  const presentMembers = members.filter(member => !absentMembers.has(member.user_id));
  const ratedPresentMembers = presentMembers.filter(member => {
    const summary = ratingsSummary.find(s => s.memberId === member.user_id);
    return summary?.actualRating !== null;
  });

  return {
    completed: ratedPresentMembers.length,
    total: presentMembers.length,
    absent: absentMembers.size,
    isComplete: ratedPresentMembers.length === presentMembers.length && presentMembers.length > 0
  };
};
