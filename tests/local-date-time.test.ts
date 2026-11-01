import { parseLocalDateTime } from "@/lib/local-date-time";

describe("parseLocalDateTime", () => {
  it.each([
    ["300", "2026-10-30T17:00:00.000Z"],
    ["-240", "2026-10-30T08:00:00.000Z"],
    ["0", "2026-10-30T12:00:00.000Z"],
  ])(
    "converts a local time with offset %s to its UTC instant",
    (offset, iso) => {
      expect(
        parseLocalDateTime("2026-10-30T12:00", offset)?.toISOString(),
      ).toBe(iso);
    },
  );

  it.each([
    ["2026-02-30T12:00", "0"],
    ["2026-10-30T12:00Z", "0"],
    ["2026-10-30T12:00", null],
    ["2026-10-30T12:00", "841"],
    ["2026-10-30T12:00", "not-an-offset"],
  ])("rejects invalid local time or offset %s/%s", (value, offset) => {
    expect(parseLocalDateTime(value, offset)).toBeNull();
  });
});
