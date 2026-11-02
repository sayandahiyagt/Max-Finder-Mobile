import "server-only";

import { getRecentFoundReports } from "@/features/lost-pets/application";
import { formatReunion } from "./formatting";

export async function getRecentReunions(
  getImageUrls: (paths: (string | null)[]) => Promise<(string | null)[]>,
) {
  const reports = await getRecentFoundReports();
  const imageUrls = await getImageUrls(
    reports.map((report) => report.imagePath),
  );
  return reports.map((report, index) =>
    formatReunion(report, imageUrls[index] ?? null),
  );
}
