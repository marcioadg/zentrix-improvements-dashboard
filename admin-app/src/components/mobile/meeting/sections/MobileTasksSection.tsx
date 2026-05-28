/**
 * MobileTasksSection — v2 mirror of the desktop TeamTasksStandupSection.
 *
 * Used for the weekly "Tasks" section and the quarterly "Next Steps" section.
 * Tasks + mutation handlers are supplied by MeetingMobile (same data the
 * desktop section receives), so this is pure presentation + the completion
 * toggle. Grouped by owner (current user first, then alphabetical), matching
 * the prototype. Creation/edit happen via the meeting FAB, not inline.
 */
import React, { useMemo } from 'react';
import { Check } from 'lucide-react';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useAuth } from '@/contexts/AuthContext';
import { UnifiedTeamTask } from '@/types/tasks';
import { cn } from '@/lib/utils';
import { MobileSectionShell, MobileAvatar } from './MobileSectionPrimitives';

interface MobileTasksSectionProps {
  teamId: string;
  tasks: UnifiedTeamTask[];
  loading?: boolean;
  sectionType?: string;
  eyebrow?: React.ReactNode;
  onTaskUpdate?: (taskId: string, updates: Partial<UnifiedTeamTask>) => Promise<void>;
}

const UNASSIGNED = '__unassigned__';

const formatDue = (
  due: string | undefined,
  completed: boolean,
): { label: string; overdue: boolean } | null => {
  if (!due) return null;
  const d = new Date(due);
  if (Number.isNaN(d.getTime())) return null;
  const overdue = !completed && isPast(d) && !isToday(d);
  let label: string;
  if (isToday(d)) label = 'Today';
  else if (isTomorrow(d)) label = 'Tomorrow';
  else label = format(d, 'MMM d');
  return { label, overdue };
};

export const MobileTasksSection: React.FC<MobileTasksSectionProps> = ({
  teamId,
  tasks,
  loading = false,
  sectionType,
  eyebrow,
  onTaskUpdate,
}) => {
  const { members } = useTeamMembers(teamId);
  const { user } = useAuth();
  const currentUserId = user?.id;

  const memberById = useMemo(() => {
    const map = new Map<string, { name: string; email: string }>();
    members.forEach((m) => {
      map.set(m.user_id, {
        name: m.profiles?.full_name || '',
        email: m.profiles?.email || '',
      });
    });
    return map;
  }, [members]);

  const activeTasks = useMemo(
    () => tasks.filter((t) => !t.archived && t.team_id === teamId),
    [tasks, teamId],
  );

  const groups = useMemo(() => {
    const byOwner = new Map<string, UnifiedTeamTask[]>();
    activeTasks.forEach((t) => {
      const ownerId = t.assigned_to?.[0] || UNASSIGNED;
      const list = byOwner.get(ownerId) ?? [];
      list.push(t);
      byOwner.set(ownerId, list);
    });

    return Array.from(byOwner.entries())
      .map(([ownerId, ownerTasks]) => {
        const profile = ownerId === UNASSIGNED ? undefined : memberById.get(ownerId);
        const name =
          ownerId === UNASSIGNED ? 'Unassigned' : profile?.name || profile?.email || 'Unknown';
        return {
          ownerId,
          name,
          email: profile?.email,
          isYou: ownerId === currentUserId,
          tasks: ownerTasks,
          done: ownerTasks.filter((t) => t.completed).length,
        };
      })
      .sort((a, b) => {
        if (a.isYou) return -1;
        if (b.isYou) return 1;
        if (a.ownerId === UNASSIGNED) return 1;
        if (b.ownerId === UNASSIGNED) return -1;
        return a.name.localeCompare(b.name);
      });
  }, [activeTasks, memberById, currentUserId]);

  const totalDone = activeTasks.filter((t) => t.completed).length;
  const isNextSteps = sectionType === 'next_steps';

  return (
    <MobileSectionShell
      eyebrow={eyebrow}
      title={isNextSteps ? 'Next Steps.' : 'To-Dos.'}
      sub={
        activeTasks.length === 0
          ? isNextSteps
            ? 'Capture action items as you go.'
            : 'No open to-dos.'
          : `${totalDone}/${activeTasks.length} done · across ${groups.length} owner${groups.length === 1 ? '' : 's'}`
      }
    >
      {loading && activeTasks.length === 0 ? (
        <div className="text-center py-8 text-[12.5px] text-muted-foreground">Loading tasks…</div>
      ) : activeTasks.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl py-6 text-center text-[12.5px] text-muted-foreground">
          {isNextSteps ? 'No action items yet.' : 'No open to-dos for this team.'}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map((g) => (
            <div key={g.ownerId}>
              <div className="flex items-center gap-2 mb-1.5">
                <MobileAvatar name={g.name} email={g.email} colorKey={g.ownerId} size={22} />
                <span className="text-[12.5px] font-semibold text-foreground">{g.name}</span>
                {g.isYou && <span className="text-[10.5px] text-muted-foreground/60">you</span>}
                <div className="flex-1" />
                <span className="text-[10.5px] text-muted-foreground tabular-nums">
                  {g.done}/{g.tasks.length} done
                </span>
              </div>
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                {g.tasks.map((t, j) => {
                  const due = formatDue(t.due_date, t.completed);
                  return (
                    <div
                      key={t.id}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2.5',
                        j < g.tasks.length - 1 && 'border-b border-border/60',
                      )}
                    >
                      <button
                        type="button"
                        aria-label={t.completed ? 'Mark incomplete' : 'Mark complete'}
                        onClick={() => onTaskUpdate?.(t.id, { completed: !t.completed })}
                        className={cn(
                          'w-[18px] h-[18px] rounded-md flex items-center justify-center shrink-0 transition-colors active:scale-90',
                          t.completed
                            ? 'bg-success border border-success'
                            : 'bg-card border-[1.5px] border-border',
                        )}
                      >
                        {t.completed && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div
                          className={cn(
                            'text-[12.5px] font-medium',
                            t.completed
                              ? 'text-muted-foreground/70 line-through'
                              : 'text-foreground',
                          )}
                        >
                          {t.title}
                        </div>
                      </div>
                      {due && (
                        <span
                          className={cn(
                            'text-[10.5px] tabular-nums shrink-0',
                            due.overdue ? 'text-destructive' : 'text-muted-foreground/70',
                          )}
                        >
                          due {due.label}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </MobileSectionShell>
  );
};

export default MobileTasksSection;
