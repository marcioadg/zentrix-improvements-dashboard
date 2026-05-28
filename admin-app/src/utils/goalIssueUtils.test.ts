import { describe, it, expect } from "vitest";
import {
  generateGoalIssueTitle,
  generateGoalIssueDescription,
  createGoalIssueData,
  statusLabels,
} from "./goalIssueUtils";

const baseGoal = {
  id: "g1",
  title: "Increase Revenue",
  description: "Grow revenue by 20%",
  status: "off_track",
  owner_id: "u1",
  target_date: "2026-06-01",
};

const mockGetProfileName = (id: string) =>
  id === "u1" ? "John Doe" : "Unknown";

describe("statusLabels", () => {
  it("has correct mappings", () => {
    expect(statusLabels.on_track).toBe("On Track");
    expect(statusLabels.off_track).toBe("Off Track");
    expect(statusLabels.complete).toBe("Complete");
    expect(statusLabels.canceled).toBe("Canceled");
  });
});

describe("generateGoalIssueTitle", () => {
  it("generates title for regular goal", () => {
    expect(generateGoalIssueTitle(baseGoal)).toBe(
      "Goal off-track: Increase Revenue"
    );
  });

  it("generates title for company goal", () => {
    expect(
      generateGoalIssueTitle({ ...baseGoal, is_company_goal: true })
    ).toBe("Company Goal off-track: Increase Revenue");
  });
});

describe("generateGoalIssueDescription", () => {
  it("includes all goal details", () => {
    const desc = generateGoalIssueDescription(baseGoal, mockGetProfileName);
    expect(desc).toContain("Goal Details:");
    expect(desc).toContain("Title: Increase Revenue");
    expect(desc).toContain("Description: Grow revenue by 20%");
    expect(desc).toContain("Status: Off Track");
    expect(desc).toContain("Owner: John Doe");
    expect(desc).toContain("Target Date:");
    expect(desc).toContain("requires immediate attention");
  });

  it("omits description if not provided", () => {
    const goal = { ...baseGoal, description: undefined };
    const desc = generateGoalIssueDescription(goal, mockGetProfileName);
    expect(desc).not.toContain("Description:");
  });

  it("omits target date if not provided", () => {
    const goal = { ...baseGoal, target_date: undefined };
    const desc = generateGoalIssueDescription(goal, mockGetProfileName);
    expect(desc).not.toContain("Target Date:");
  });

  it("labels company goals differently", () => {
    const goal = { ...baseGoal, is_company_goal: true };
    const desc = generateGoalIssueDescription(goal, mockGetProfileName);
    expect(desc).toContain("Company Goal Details:");
    expect(desc).toContain("company goal requires immediate attention");
  });
});

describe("createGoalIssueData", () => {
  it("creates correct data object", () => {
    const result = createGoalIssueData(
      baseGoal,
      "team1",
      "creator1",
      mockGetProfileName
    );
    expect(result.title).toBe("Goal off-track: Increase Revenue");
    expect(result.team_id).toBe("team1");
    expect(result.owner_id).toBe("u1");
    expect(result.created_by).toBe("creator1");
    expect(result.issue_type).toBe("short_term");
    expect(result.status).toBe("open");
    expect(result.archived).toBe(false);
  });
});
