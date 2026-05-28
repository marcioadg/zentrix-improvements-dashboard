import { describe, it, expect } from "vitest";
import { filterGeneralTeam, isGeneralTeam } from "./teamFilters";

const makeTeam = (name: string, id = "1") => ({
  id,
  name,
  company_id: "c1",
});

describe("filterGeneralTeam", () => {
  it("removes 'General' team", () => {
    const teams = [makeTeam("General"), makeTeam("Engineering")];
    expect(filterGeneralTeam(teams)).toEqual([makeTeam("Engineering")]);
  });

  it("removes 'General Team' (case-insensitive)", () => {
    const teams = [makeTeam("GENERAL TEAM"), makeTeam("Sales")];
    expect(filterGeneralTeam(teams)).toEqual([makeTeam("Sales")]);
  });

  it("keeps teams with missing names", () => {
    const teams = [{ id: "1", name: "", company_id: "c1" }, makeTeam("Dev")];
    expect(filterGeneralTeam(teams).length).toBe(2);
  });

  it("returns empty array for non-array input", () => {
    expect(filterGeneralTeam(null as any)).toEqual([]);
    expect(filterGeneralTeam(undefined as any)).toEqual([]);
  });

  it("returns empty array for empty input", () => {
    expect(filterGeneralTeam([])).toEqual([]);
  });
});

describe("isGeneralTeam", () => {
  it("returns true for 'general'", () => {
    expect(isGeneralTeam(makeTeam("general"))).toBe(true);
  });

  it("returns true for 'General Team'", () => {
    expect(isGeneralTeam(makeTeam("General Team"))).toBe(true);
  });

  it("returns false for other teams", () => {
    expect(isGeneralTeam(makeTeam("Engineering"))).toBe(false);
  });

  it("returns false for team with no name", () => {
    expect(isGeneralTeam({ id: "1", company_id: "c1" } as any)).toBe(false);
  });
});
