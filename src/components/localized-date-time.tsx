"use client";

import { useHydrated } from "@/components/use-hydrated";

export function LocalizedDateTime({
  value,
  dateOnly = false,
}: {
  value: Date | string;
  dateOnly?: boolean;
}) {
  const isHydrated = useHydrated();
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return <time>Unknown time</time>;

  const isoValue = date.toISOString();
  const displayValue = isHydrated
    ? dateOnly
      ? date.toLocaleDateString()
      : date.toLocaleString()
    : isoValue;

  return <time dateTime={isoValue}>{displayValue}</time>;
}
