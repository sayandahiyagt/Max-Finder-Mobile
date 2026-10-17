import type { ReportCard } from "@/types/reports";

export type ReportFilter = "all" | "lost" | "found";

export type ScrollContainer = {
  scrollLeft: number;
  scrollWidth: number;
  clientWidth: number;
};

export function filterReports(
  reports: ReportCard[],
  filter: ReportFilter,
): ReportCard[] {
  if (filter === "all") return reports;
  const status = filter === "lost" ? "LOST" : "FOUND";
  return reports.filter((report) => report.status === status);
}

export function canScrollLeft(container: ScrollContainer | null): boolean {
  return !!container && container.scrollLeft > 0;
}

export function canScrollRight(container: ScrollContainer | null): boolean {
  return (
    !!container &&
    container.scrollLeft < container.scrollWidth - container.clientWidth
  );
}
