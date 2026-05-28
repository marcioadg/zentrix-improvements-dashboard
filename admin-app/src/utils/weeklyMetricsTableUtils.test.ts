import { describe, it, expect, vi } from "vitest";

vi.mock("@/utils/logger", () => ({
  logger: { log: vi.fn() },
}));

import {
  sortMetricsByName,
  filterMetricsBySearch,
} from "./weeklyMetricsTableUtils";

const makeMetric = (name: string, owner = "Owner") =>
  ({
    id: name,
    metric_name: name,
    owner,
  }) as any;

describe("sortMetricsByName", () => {
  it("sorts metrics alphabetically by name", () => {
    const metrics = [makeMetric("Zebra"), makeMetric("Alpha"), makeMetric("Mid")];
    const sorted = sortMetricsByName(metrics);
    expect(sorted.map((m: any) => m.metric_name)).toEqual(["Alpha", "Mid", "Zebra"]);
  });

  it("does not mutate original array", () => {
    const metrics = [makeMetric("B"), makeMetric("A")];
    sortMetricsByName(metrics);
    expect(metrics[0].metric_name).toBe("B");
  });
});

describe("filterMetricsBySearch", () => {
  it("returns all metrics for empty search", () => {
    const metrics = [makeMetric("A"), makeMetric("B")];
    expect(filterMetricsBySearch(metrics, "")).toEqual(metrics);
    expect(filterMetricsBySearch(metrics, "   ")).toEqual(metrics);
  });

  it("filters by metric name (case-insensitive)", () => {
    const metrics = [makeMetric("Revenue"), makeMetric("Costs")];
    const result = filterMetricsBySearch(metrics, "rev");
    expect(result).toHaveLength(1);
    expect(result[0].metric_name).toBe("Revenue");
  });

  it("filters by owner name", () => {
    const metrics = [
      makeMetric("Revenue", "John"),
      makeMetric("Costs", "Jane"),
    ];
    const result = filterMetricsBySearch(metrics, "jane");
    expect(result).toHaveLength(1);
    expect(result[0].metric_name).toBe("Costs");
  });

  it("returns empty array when nothing matches", () => {
    const metrics = [makeMetric("Revenue")];
    expect(filterMetricsBySearch(metrics, "xyz")).toEqual([]);
  });
});
