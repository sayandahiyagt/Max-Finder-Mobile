"use client";

import dynamic from "next/dynamic";

const ReportLocationFields = dynamic(
  () => import("@/components/location-picker").then((module) => {
    return function ReportFields() {
      return (
        <>
          <module.CurrentDateTimeInput name="lastSeenAt" label="Last seen date and time" />
          <div className="form-field full">
            <module.LocationPickerFields />
          </div>
        </>
      );
    };
  }),
  { ssr: false },
);

export default ReportLocationFields;
