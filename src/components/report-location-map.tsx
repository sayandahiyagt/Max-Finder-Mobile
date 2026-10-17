"use client";

import dynamic from "next/dynamic";

export const ReportLocationMap = dynamic(
  () => import("@/components/report-location-map-client").then((module) => module.ReportLocationMapClient),
  { ssr: false },
);
