import { describe, it, expect, vi } from "vitest";

vi.mock("@/utils/logger", () => ({
  logger: { log: vi.fn() },
}));

import { getUserDisplayName, getUserDisplayInfo } from "./userDisplayUtils";

describe("getUserDisplayName", () => {
  it("returns full_name when available", () => {
    expect(getUserDisplayName({ full_name: "John Doe" })).toBe("John Doe");
  });

  it("trims full_name", () => {
    expect(getUserDisplayName({ full_name: "  Jane  " })).toBe("Jane");
  });

  it("extracts username from email when no full_name", () => {
    expect(getUserDisplayName({ email: "john@example.com" })).toBe("john");
  });

  it("returns full email when no @ symbol", () => {
    expect(getUserDisplayName({ email: "localuser" })).toBe("localuser");
  });

  it("returns 'Unknown User' for null/undefined user", () => {
    expect(getUserDisplayName(null as any)).toBe("Unknown User");
    expect(getUserDisplayName(undefined as any)).toBe("Unknown User");
  });

  it("returns 'Unknown User' when no name or email", () => {
    expect(getUserDisplayName({ id: "123" })).toBe("Unknown User");
  });

  it("returns 'Unknown User' for empty full_name and no email", () => {
    expect(getUserDisplayName({ full_name: "   " })).toBe("Unknown User");
  });

  it("prefers full_name over email", () => {
    expect(
      getUserDisplayName({ full_name: "John", email: "john@example.com" })
    ).toBe("John");
  });
});

describe("getUserDisplayInfo", () => {
  it("returns displayName and subtitle when full_name exists", () => {
    const result = getUserDisplayInfo({
      full_name: "John Doe",
      email: "john@example.com",
    });
    expect(result.displayName).toBe("John Doe");
    expect(result.hasRealName).toBe(true);
    expect(result.subtitle).toBe("john@example.com");
  });

  it("returns no subtitle when no full_name", () => {
    const result = getUserDisplayInfo({ email: "john@example.com" });
    expect(result.displayName).toBe("john");
    expect(result.hasRealName).toBeFalsy();
    expect(result.subtitle).toBeUndefined();
  });
});
