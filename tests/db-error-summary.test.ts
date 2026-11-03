import { summarizeDatabaseError } from "@/lib/error-summary";

describe("database error summary", () => {
  it("redacts connection strings while retaining useful failure details", () => {
    expect(
      summarizeDatabaseError(
        new Error(
          "connection failed: postgresql://postgres.secret:password@host:6543/postgres",
        ),
      ),
    ).toEqual({
      name: "Error",
      message: "connection failed: postgresql://<redacted>",
    });
  });
});
