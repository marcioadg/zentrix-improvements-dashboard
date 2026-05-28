vi.mock('@/utils/logger', () => ({ logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { getNewMeetingTasks, getAdjustedCompletionStatus } from './wrapUpUtils';

describe('getNewMeetingTasks', () => {
  const meetingId = 'meeting-1';

  it('returns empty array when no start time provided', () => {
    const tasks = [{ id: '1', created_at: new Date().toISOString(), archived: false }];
    const result = getNewMeetingTasks(tasks as any, null, meetingId);
    expect(result).toEqual([]);
  });

  it('returns empty array when start time is 0', () => {
    const result = getNewMeetingTasks([] as any, 0, meetingId);
    expect(result).toEqual([]);
  });

  it('filters tasks created after meeting start time', () => {
    const startTime = new Date('2026-03-25T10:00:00Z').getTime();
    const tasks = [
      { id: '1', created_at: '2026-03-25T10:05:00Z', archived: false },
      { id: '2', created_at: '2026-03-25T09:00:00Z', archived: false },
      { id: '3', created_at: '2026-03-25T11:00:00Z', archived: false },
    ];
    const result = getNewMeetingTasks(tasks as any, startTime, meetingId);
    const ids = result.map((t: any) => t.id);
    expect(ids).toContain('1');
    expect(ids).toContain('3');
    expect(ids).not.toContain('2');
  });

  it('excludes archived tasks', () => {
    const startTime = new Date('2026-03-25T10:00:00Z').getTime();
    const tasks = [
      { id: '1', created_at: '2026-03-25T10:05:00Z', archived: false },
      { id: '2', created_at: '2026-03-25T10:05:00Z', archived: true },
    ];
    const result = getNewMeetingTasks(tasks as any, startTime, meetingId);
    const ids = result.map((t: any) => t.id);
    expect(ids).toContain('1');
    expect(ids).not.toContain('2');
  });

  it('includes tasks within the 30-second buffer before start', () => {
    const startTime = new Date('2026-03-25T10:00:00Z').getTime();
    const tasks = [
      // Task created 20 seconds before start (within 30s buffer)
      { id: '1', created_at: '2026-03-25T09:59:45Z', archived: false },
      // Task created 60 seconds before start (outside buffer)
      { id: '2', created_at: '2026-03-25T09:59:00Z', archived: false },
    ];
    const result = getNewMeetingTasks(tasks as any, startTime, meetingId);
    const ids = result.map((t: any) => t.id);
    expect(ids).toContain('1');
    expect(ids).not.toContain('2');
  });
});

describe('getAdjustedCompletionStatus', () => {
  it('returns isComplete true when all present members have rated', () => {
    const members = [
      { user_id: 'u1' },
      { user_id: 'u2' },
      { user_id: 'u3' },
    ];
    const absentMembers = new Set(['u3']);
    const ratingsSummary = [
      { memberId: 'u1', actualRating: 5 },
      { memberId: 'u2', actualRating: 4 },
    ];
    const result = getAdjustedCompletionStatus(members as any, absentMembers, ratingsSummary);
    expect(result.isComplete).toBe(true);
    expect(result.completed).toBe(2);
    expect(result.total).toBe(2);
    expect(result.absent).toBe(1);
  });

  it('excludes absent members from completion calculation', () => {
    const members = [
      { user_id: 'u1' },
      { user_id: 'u2' },
      { user_id: 'u3' },
    ];
    const absentMembers = new Set(['u2', 'u3']);
    const ratingsSummary = [
      { memberId: 'u1', actualRating: 3 },
    ];
    const result = getAdjustedCompletionStatus(members as any, absentMembers, ratingsSummary);
    expect(result.isComplete).toBe(true);
    expect(result.completed).toBe(1);
    expect(result.total).toBe(1);
  });

  it('returns completed=0 when all have null ratings', () => {
    const members = [
      { user_id: 'u1' },
      { user_id: 'u2' },
    ];
    const absentMembers = new Set<string>();
    const ratingsSummary = [
      { memberId: 'u1', actualRating: null },
      { memberId: 'u2', actualRating: null },
    ];
    const result = getAdjustedCompletionStatus(members as any, absentMembers, ratingsSummary);
    expect(result.completed).toBe(0);
    expect(result.isComplete).toBe(false);
  });
});
