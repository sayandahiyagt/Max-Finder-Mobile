"use client";

import { useState } from "react";

import { useHydrated } from "@/components/use-hydrated";

function localDateTimeValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function timezoneOffsetFor(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return localDateTimeValue(date) === value
    ? String(date.getTimezoneOffset())
    : "";
}

export function CurrentDateTimeInput({
  name = "spottedAt",
  label = "Date and time spotted",
  initialValue,
  initialTimezoneOffset,
}: {
  name?: string;
  label?: string;
  initialValue?: string;
  initialTimezoneOffset?: string;
}) {
  const isHydrated = useHydrated();
  const [selectedValue, setSelectedValue] = useState<string | null>(
    initialValue ?? null,
  );
  const [selectedTimezoneOffset, setSelectedTimezoneOffset] = useState<
    string | null
  >(initialTimezoneOffset ?? null);
  const value =
    selectedValue ?? (isHydrated ? localDateTimeValue(new Date()) : "");

  return (
    <>
      <label className="form-field">
        {label}
        <input
          name={name}
          type="datetime-local"
          value={value}
          onChange={(event) => {
            const nextValue = event.target.value;
            setSelectedValue(nextValue);
            setSelectedTimezoneOffset(timezoneOffsetFor(nextValue));
          }}
          required
        />
      </label>
      <input
        type="hidden"
        name={`${name}TimezoneOffset`}
        value={selectedTimezoneOffset ?? timezoneOffsetFor(value)}
      />
    </>
  );
}
