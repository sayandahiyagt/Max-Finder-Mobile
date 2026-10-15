"use client";

import dynamic from "next/dynamic";

const SpottingLocationFields = dynamic(
  () => import("@/components/location-picker"),
  { ssr: false },
);

export default SpottingLocationFields;
