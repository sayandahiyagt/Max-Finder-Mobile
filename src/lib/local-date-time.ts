const DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/;

export function parseLocalDateTime(
  value: FormDataEntryValue | null,
  rawTimezoneOffset: FormDataEntryValue | null,
): Date | null {
  if (typeof value !== "string" || typeof rawTimezoneOffset !== "string")
    return null;

  const match = DATE_TIME_PATTERN.exec(value);
  const timezoneOffset = Number(rawTimezoneOffset);
  if (
    !match ||
    !/^-?\d{1,4}$/.test(rawTimezoneOffset) ||
    !Number.isInteger(timezoneOffset) ||
    Math.abs(timezoneOffset) > 14 * 60
  ) {
    return null;
  }

  const [, year, month, day, hour, minute, second = "0", fraction = "0"] =
    match;
  const wallTime = new Date(0);
  wallTime.setUTCFullYear(Number(year), Number(month) - 1, Number(day));
  wallTime.setUTCHours(
    Number(hour),
    Number(minute),
    Number(second),
    Number(fraction.padEnd(3, "0")),
  );

  if (
    wallTime.getUTCFullYear() !== Number(year) ||
    wallTime.getUTCMonth() !== Number(month) - 1 ||
    wallTime.getUTCDate() !== Number(day) ||
    wallTime.getUTCHours() !== Number(hour) ||
    wallTime.getUTCMinutes() !== Number(minute) ||
    wallTime.getUTCSeconds() !== Number(second)
  ) {
    return null;
  }

  return new Date(wallTime.getTime() + timezoneOffset * 60_000);
}
