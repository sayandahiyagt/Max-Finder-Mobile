import { validateDisplayName } from "@/lib/profile";

describe("validateDisplayName", () => {
  it("trims and accepts a valid display name", () => {
    expect(validateDisplayName("  Maya Chen  ")).toEqual({
      kind: "valid",
      displayName: "Maya Chen",
    });
  });

  it("returns useful validation errors", () => {
    expect(validateDisplayName("   ")).toEqual({
      kind: "invalid",
      message: "Display name is required.",
    });
    expect(validateDisplayName("x".repeat(101))).toEqual({
      kind: "invalid",
      message: "Display name must be 100 characters or fewer.",
    });
  });
});
