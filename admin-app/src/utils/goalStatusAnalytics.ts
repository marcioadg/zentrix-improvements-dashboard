import { TimeSeriesDataPoint } from "@/types/analytics";
import { TimeBucket } from "./timeBucketUtils";

export type GoalStatus = "complete" | "on_track" | "off_track" | "canceled";

export interface GoalStatusGoal {
  id: string;
  status: string | null;
  created_at: string | null;
  updated_at?: string | null;
  archived?: boolean | null;
  is_deleted?: boolean | null;
  deleted_at?: string | null;
}

export interface GoalStatusSnapshot {
  goal_id: string;
  status: string | null;
  snapshot_date: string;
}

export interface GoalStatusAsOf {
  goalId: string;
  status: GoalStatus;
  updatedAt: string;
}

const VALID_GOAL_STATUSES = new Set<GoalStatus>([
  "complete",
  "on_track",
  "off_track",
  "canceled",
]);

const STATUS_LABELS: Record<GoalStatus, string> = {
  complete: "Completed",
  on_track: "On Track",
  off_track: "Off Track",
  canceled: "Canceled",
};

const toDateTime = (value: string | null | undefined): number => {
  if (!value) return Number.NEGATIVE_INFINITY;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : Number.NEGATIVE_INFINITY;
};

const isActiveGoal = (goal: GoalStatusGoal): boolean => (
  goal.archived !== true &&
  goal.is_deleted !== true &&
  !goal.deleted_at
);

export const normalizeGoalStatus = (status: string | null | undefined): GoalStatus | null => {
  return status && VALID_GOAL_STATUSES.has(status as GoalStatus)
    ? (status as GoalStatus)
    : null;
};

export const getGoalStatusesAsOfBucketEnd = (
  goals: GoalStatusGoal[],
  snapshots: GoalStatusSnapshot[],
  bucket: TimeBucket
): GoalStatusAsOf[] => {
  const bucketEndTime = bucket.end.getTime();
  const snapshotsByGoal = new Map<string, GoalStatusSnapshot>();

  snapshots.forEach((snapshot) => {
    const snapshotTime = toDateTime(snapshot.snapshot_date);
    if (snapshotTime > bucketEndTime) return;

    const existing = snapshotsByGoal.get(snapshot.goal_id);
    if (!existing || snapshotTime > toDateTime(existing.snapshot_date)) {
      snapshotsByGoal.set(snapshot.goal_id, snapshot);
    }
  });

  return goals
    .filter((goal) => isActiveGoal(goal) && toDateTime(goal.created_at) <= bucketEndTime)
    .map((goal) => {
      const latestSnapshot = snapshotsByGoal.get(goal.id);
      const status = latestSnapshot
        ? normalizeGoalStatus(latestSnapshot.status)
        : normalizeGoalStatus(goal.status);
      if (!status) return null;

      return {
        goalId: goal.id,
        status,
        updatedAt: latestSnapshot?.snapshot_date ?? goal.updated_at ?? goal.created_at ?? "",
      };
    })
    .filter((goalStatus): goalStatus is GoalStatusAsOf => goalStatus !== null);
};

export const buildGoalStatusTimeSeries = (
  goals: GoalStatusGoal[],
  snapshots: GoalStatusSnapshot[],
  buckets: TimeBucket[]
): TimeSeriesDataPoint[] => {
  return buckets.map((bucket) => {
    const statuses = getGoalStatusesAsOfBucketEnd(goals, snapshots, bucket);
    const total = statuses.length;
    const counts: Record<GoalStatus, number> = {
      complete: 0,
      on_track: 0,
      off_track: 0,
      canceled: 0,
    };

    statuses.forEach((goal) => {
      counts[goal.status] += 1;
    });

    const result: TimeSeriesDataPoint = {
      date: bucket.dateKey,
      period: bucket.label,
    };

    (Object.keys(STATUS_LABELS) as GoalStatus[]).forEach((status) => {
      result[STATUS_LABELS[status]] = total > 0 ? (counts[status] / total) * 100 : 0;
    });

    return result;
  });
};
