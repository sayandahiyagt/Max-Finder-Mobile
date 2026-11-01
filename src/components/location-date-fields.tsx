"use client";

import dynamic from "next/dynamic";

import { CurrentDateTimeInput } from "@/components/current-date-time-input";

const LocationPickerFields = dynamic(
  () =>
    import("@/components/location-picker").then(
      (module) => module.LocationPickerFields,
    ),
  { ssr: false },
);

export function LocationDateFields({
  dateName = "spottedAt",
  dateLabel = "Date and time spotted",
  initialValues,
}: {
  dateName?: string;
  dateLabel?: string;
  initialValues?: {
    dateTime: string;
    timezoneOffset: string;
    locationLabel: string;
    latitude: string;
    longitude: string;
  };
}) {
  return (
    <>
      <CurrentDateTimeInput
        name={dateName}
        label={dateLabel}
        {...(initialValues
          ? {
              initialValue: initialValues.dateTime,
              initialTimezoneOffset: initialValues.timezoneOffset,
            }
          : {})}
      />
      <div className="form-field full">
        <LocationPickerFields
          {...(initialValues
            ? {
                initialLocationLabel: initialValues.locationLabel,
                initialLatitude: initialValues.latitude,
                initialLongitude: initialValues.longitude,
              }
            : {})}
        />
      </div>
    </>
  );
}
