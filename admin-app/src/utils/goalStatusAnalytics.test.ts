import { describe, expect, it } from "vitest";
import {
  buildGoalStatusTimeSeries,
  getGoalStatusesAsOfBucketEnd,
} from "./goalStatusAnalytics";

const bucket = {
  start: new Date("2026-04-01T00:00:00.000Z"),
  end: new Date("2026-04-30T23:59:59.999Z"),
  label: "Apr 2026",
  dateKey: "2026-04-01T00:00:00.000Z",
};

describe("goalStatusAnalytics", () => {
  it("uses the latest snapshot on or before the bucket end", () => {
    const statuses = getGoalStatusesAsOfBucketEnd(
      [{ id: "goal-1", status: "on_track", created_at: "2026-01-10T00:00:00.000Z" }],
      [
        { goal_id: "goal-1", status: "on_track", snapshot_date: "2026-03-15" },
        { goal_id: "goal-1", status: "off_track", snapshot_date: "2026-04-12" },
        { goal_id: "goal-1", status: "complete", snapshot_date: "2026-05-02" },
      ],
      bucket
    );

    expect(statuses).toEqual([
      {
        goalId: "goal-1",
        status: "off_track",
        updatedAt: "2026-04-12",
      },
    ]);
  });

  it("falls back to current goal status when no prior snapshots exist", () => {
    const series = buildGoalStatusTimeSeries(
      [
        { id: "goal-1", status: "on_track", created_at: "2026-04-03T00:00:00.000Z" },
        { id: "goal-2", status: "off_track", created_at: "2026-04-05T00:00:00.000Z" },
      ],
      [],
      [bucket]
    );

    expect(series[0]["On Track"]).toBe(50);
    expect(series[0]["Off Track"]).toBe(50);
    expect(series[0]["Completed"]).toBe(0);
    expect(series[0]["Canceled"]).toBe(0);
  });

  it("does not fall back to current status when a prior snapshot has an invalid status", () => {
    const series = buildGoalStatusTimeSeries(
      [
        { id: "goal-1", status: "on_track", created_at: "2026-04-03T00:00:00.000Z" },
        { id: "goal-2", status: "off_track", created_at: "2026-04-05T00:00:00.000Z" },
      ],
      [
        { goal_id: "goal-1", status: "paused", snapshot_date: "2026-04-10" },
      ],
      [bucket]
    );

    expect(series[0]["On Track"]).toBe(0);
    expect(series[0]["Off Track"]).toBe(100);
  });

  it("excludes goals created after the bucket end", () => {
    const series = buildGoalStatusTimeSeries(
      [
        { id: "goal-1", status: "on_track", created_at: "2026-04-03T00:00:00.000Z" },
        { id: "goal-2", status: "off_track", created_at: "2026-05-01T00:00:00.000Z" },
      ],
      [],
      [bucket]
    );

    expect(series[0]["On Track"]).toBe(100);
    expect(series[0]["Off Track"]).toBe(0);
  });

  it("excludes archived and deleted goals", () => {
    const series = buildGoalStatusTimeSeries(
      [
        { id: "active", status: "on_track", created_at: "2026-04-03T00:00:00.000Z" },
        { id: "archived", status: "off_track", created_at: "2026-04-03T00:00:00.000Z", archived: true },
        { id: "soft-deleted", status: "off_track", created_at: "2026-04-03T00:00:00.000Z", is_deleted: true },
        { id: "deleted-at", status: "off_track", created_at: "2026-04-03T00:00:00.000Z", deleted_at: "2026-04-20T00:00:00.000Z" },
      ],
      [],
      [bucket]
    );

    expect(series[0]["On Track"]).toBe(100);
    expect(series[0]["Off Track"]).toBe(0);
  });
});
