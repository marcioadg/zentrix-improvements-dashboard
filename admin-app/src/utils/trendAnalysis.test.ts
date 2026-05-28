import { describe, it, expect } from "vitest";
import {
  calculateTrend,
  getTrendIcon,
  getPredictionIcon,
  formatTrendSummary,
} from "./trendAnalysis";

describe("calculateTrend", () => {
  it("returns stable defaults for null currentValue", () => {
    const result = calculateTrend(null, [], null, null);
    expect(result.direction).toBe("stable");
    expect(result.movingAverage).toBe(0);
  });

  it("returns stable defaults for fewer than 2 historical values", () => {
    const result = calculateTrend(10, [{ week: "w1", value: 10 }], null, null);
    expect(result.direction).toBe("stable");
  });

  it("handles currentValue of 0 (not treated as falsy)", () => {
    const history = [
      { week: "w1", value: 5 },
      { week: "w2", value: 3 },
      { week: "w3", value: 1 },
    ];
    const result = calculateTrend(0, history, null, null);
    expect(result.movingAverage).toBeCloseTo((5 + 3 + 1) / 3, 1);
  });

  it("detects improving trend for greater_than logic", () => {
    const history = [
      { week: "w1", value: 50 },
      { week: "w2", value: 60 },
      { week: "w3", value: 80 },
    ];
    const result = calculateTrend(100, history, 120, "greater_than");
    expect(result.direction).toBe("improving");
  });

  it("detects declining trend for greater_than logic", () => {
    const history = [
      { week: "w1", value: 100 },
      { week: "w2", value: 90 },
      { week: "w3", value: 80 },
    ];
    const result = calculateTrend(60, history, 120, "greater_than");
    expect(result.direction).toBe("declining");
  });

  it("detects improving trend for less_than logic (value decreasing)", () => {
    const history = [
      { week: "w1", value: 100 },
      { week: "w2", value: 80 },
      { week: "w3", value: 60 },
    ];
    const result = calculateTrend(40, history, 50, "less_than");
    expect(result.direction).toBe("improving");
  });

  it("predicts likely_miss when far from target (greater_than)", () => {
    const history = [
      { week: "w1", value: 10 },
      { week: "w2", value: 10 },
      { week: "w3", value: 10 },
    ];
    const result = calculateTrend(10, history, 100, "greater_than");
    expect(result.prediction).toBe("likely_miss");
  });

  it("predicts exceeding when well above target (greater_than)", () => {
    const history = [
      { week: "w1", value: 100 },
      { week: "w2", value: 110 },
      { week: "w3", value: 120 },
    ];
    const result = calculateTrend(130, history, 100, "greater_than");
    expect(result.prediction).toBe("exceeding");
  });

  it("calculates volatility correctly", () => {
    const history = [
      { week: "w1", value: 10 },
      { week: "w2", value: 100 },
      { week: "w3", value: 10 },
    ];
    const result = calculateTrend(100, history, null, null);
    expect(result.consistency).toBe("volatile");
  });

  it("calculates consistency for stable values", () => {
    const history = [
      { week: "w1", value: 100 },
      { week: "w2", value: 101 },
      { week: "w3", value: 100 },
    ];
    const result = calculateTrend(101, history, null, null);
    expect(result.consistency).toBe("consistent");
  });

  it("filters out null historical values", () => {
    const history = [
      { week: "w1", value: null },
      { week: "w2", value: 50 },
      { week: "w3", value: 60 },
    ];
    const result = calculateTrend(70, history, null, null);
    // previousValue is recentValues[length-2] = 50 (filtered: [50, 60])
    expect(result.weekOverWeekChange).toBeCloseTo(((70 - 50) / 50) * 100, 1);
  });

  it("handles previousValue of 0", () => {
    const history = [
      { week: "w1", value: 0 },
      { week: "w2", value: 0 },
    ];
    const result = calculateTrend(5, history, null, null);
    expect(result.weekOverWeekChange).toBe(100);
  });
});

describe("getTrendIcon", () => {
  it("returns correct icons", () => {
    expect(getTrendIcon("improving")).toBe("📈");
    expect(getTrendIcon("declining")).toBe("📉");
    expect(getTrendIcon("stable")).toBe("➡️");
  });
});

describe("getPredictionIcon", () => {
  it("returns correct icons", () => {
    expect(getPredictionIcon("likely_miss")).toBe("⚠️");
    expect(getPredictionIcon("on_track")).toBe("✅");
    expect(getPredictionIcon("exceeding")).toBe("🚀");
  });
});

describe("formatTrendSummary", () => {
  it("formats stable on_track summary", () => {
    const result = formatTrendSummary({
      direction: "stable",
      changePercent: 0,
      velocity: 0,
      prediction: "on_track",
      weekOverWeekChange: 0,
      movingAverage: 50,
      consistency: "stable",
    });
    expect(result).toBe("➡️ STABLE");
  });

  it("includes change percent and prediction when applicable", () => {
    const result = formatTrendSummary({
      direction: "improving",
      changePercent: 15.5,
      velocity: 5,
      prediction: "exceeding",
      weekOverWeekChange: 15.5,
      movingAverage: 100,
      consistency: "consistent",
    });
    expect(result).toContain("📈 IMPROVING");
    expect(result).toContain("+15.5%");
    expect(result).toContain("🚀 EXCEEDING");
  });
});
