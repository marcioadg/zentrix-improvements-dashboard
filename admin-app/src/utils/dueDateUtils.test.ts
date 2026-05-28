import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getDueDateInfo, getCompletedDateInfo } from "./dueDateUtils";

describe("getDueDateInfo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 15, 10, 0, 0)); // March 15, 2026 10:00
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null for undefined input", () => {
    expect(getDueDateInfo()).toBeNull();
    expect(getDueDateInfo(undefined)).toBeNull();
  });

  it("detects overdue dates", () => {
    const result = getDueDateInfo("2026-03-10");
    expect(result!.isOverdue).toBe(true);
    expect(result!.text).toContain("overdue");
  });

  it("detects due today", () => {
    const result = getDueDateInfo("2026-03-15");
    expect(result!.isDueToday).toBe(true);
    expect(result!.text).toBe("Due today");
  });

  it("detects due tomorrow", () => {
    const result = getDueDateInfo("2026-03-16");
    expect(result!.text).toBe("Due tomorrow");
  });

  it("shows days left for 2-3 days", () => {
    const result = getDueDateInfo("2026-03-17");
    expect(result!.text).toBe("2 days left");
  });

  it("shows days left for 4-7 days", () => {
    const result = getDueDateInfo("2026-03-20");
    expect(result!.text).toBe("5 days left");
  });

  it("shows formatted date for >7 days", () => {
    const result = getDueDateInfo("2026-04-15");
    expect(result!.text).toBe("Apr 15");
  });

  it("handles 1 day overdue", () => {
    const result = getDueDateInfo("2026-03-14");
    expect(result!.text).toBe("1 day overdue");
  });

  it("parses YYYY-MM-DD as local date", () => {
    const result = getDueDateInfo("2026-03-15");
    expect(result!.dueDate.getDate()).toBe(15);
    expect(result!.dueDate.getMonth()).toBe(2); // March = 2
  });
});

describe("getCompletedDateInfo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 15, 10, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null for null/undefined input", () => {
    expect(getCompletedDateInfo(null)).toBeNull();
    expect(getCompletedDateInfo(undefined)).toBeNull();
  });

  it("shows 'Completed today'", () => {
    const result = getCompletedDateInfo("2026-03-15T08:00:00Z");
    expect(result!.text).toBe("Completed today");
  });

  it("shows 'Completed yesterday'", () => {
    const result = getCompletedDateInfo("2026-03-14T08:00:00Z");
    expect(result!.text).toBe("Completed yesterday");
  });

  it("shows 'Completed N days ago'", () => {
    const result = getCompletedDateInfo("2026-03-10T08:00:00Z");
    expect(result!.text).toBe("Completed 5 days ago");
  });

  it("always returns emerald className", () => {
    const result = getCompletedDateInfo("2026-03-15T08:00:00Z");
    expect(result!.className).toContain("emerald");
  });
});
