import { describe, it, expect } from "vitest";
import {
  parseLocalDate,
  getLocalEndOfDay,
  isDateInBucket,
  generateTimeBuckets,
  getDateRange,
} from "./timeBucketUtils";

describe("parseLocalDate", () => {
  it("returns Date objects as-is", () => {
    const d = new Date(2026, 0, 15);
    expect(parseLocalDate(d)).toBe(d);
  });

  it("parses ISO timestamp strings normally", () => {
    const result = parseLocalDate("2026-01-15T10:00:00Z");
    expect(result).toBeInstanceOf(Date);
  });

  it("parses YYYY-MM-DD as local midday", () => {
    const result = parseLocalDate("2026-01-15");
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(0);
    expect(result.getDate()).toBe(15);
    expect(result.getHours()).toBe(12);
  });
});

describe("getLocalEndOfDay", () => {
  it("returns end of day for YYYY-MM-DD", () => {
    const result = getLocalEndOfDay("2026-03-15");
    expect(result.getHours()).toBe(23);
    expect(result.getMinutes()).toBe(59);
    expect(result.getSeconds()).toBe(59);
    expect(result.getDate()).toBe(15);
  });
});

describe("isDateInBucket", () => {
  const bucket = {
    start: new Date(2026, 0, 6, 0, 0, 0),
    end: new Date(2026, 0, 12, 23, 59, 59, 999),
    label: "Jan 6",
    dateKey: new Date(2026, 0, 6).toISOString(),
  };

  it("returns true for date within bucket", () => {
    expect(isDateInBucket("2026-01-08", bucket)).toBe(true);
  });

  it("returns true for date on bucket boundary", () => {
    expect(isDateInBucket(new Date(2026, 0, 6, 0, 0, 0), bucket)).toBe(true);
  });

  it("returns false for date outside bucket", () => {
    expect(isDateInBucket("2026-01-15", bucket)).toBe(false);
  });
});

describe("generateTimeBuckets", () => {
  it("generates weekly buckets", () => {
    const start = new Date(2026, 0, 5); // Monday
    const end = new Date(2026, 0, 25);
    const buckets = generateTimeBuckets(start, end, "weekly");
    expect(buckets.length).toBeGreaterThanOrEqual(3);
    expect(buckets[0].label).toMatch(/Jan \d+/);
  });

  it("generates monthly buckets", () => {
    const start = new Date(2026, 0, 1);
    const end = new Date(2026, 2, 31);
    const buckets = generateTimeBuckets(start, end, "monthly");
    expect(buckets.length).toBe(3);
    expect(buckets[0].label).toContain("Jan");
    expect(buckets[1].label).toContain("Feb");
  });

  it("generates quarterly buckets", () => {
    const start = new Date(2026, 0, 1);
    const end = new Date(2026, 11, 31);
    const buckets = generateTimeBuckets(start, end, "quarterly");
    expect(buckets.length).toBe(4);
    expect(buckets[0].label).toContain("Q1");
  });

  it("generates yearly buckets", () => {
    const start = new Date(2024, 0, 1);
    const end = new Date(2026, 11, 31);
    const buckets = generateTimeBuckets(start, end, "yearly");
    expect(buckets.length).toBe(3);
  });
});

describe("getDateRange", () => {
  it("returns start and end for 4weeks", () => {
    const { start, end } = getDateRange("4weeks");
    expect(end.getTime()).toBeGreaterThan(start.getTime());
    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThanOrEqual(27);
  });

  it("returns start and end for 1year", () => {
    const { start, end } = getDateRange("1year");
    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThanOrEqual(360);
  });
});
