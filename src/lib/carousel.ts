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

export function clampedIndex(count: number, index: number): number {
  if (count <= 0) return 0;
  return Math.max(0, Math.min(index, count - 1));
}

export function nextIndex(count: number, index: number): number {
  if (count <= 0) return 0;
  const current = clampedIndex(count, index);
  return Math.min(current + 1, count - 1);
}

export function prevIndex(count: number, index: number): number {
  if (count <= 0) return 0;
  const current = clampedIndex(count, index);
  return Math.max(current - 1, 0);
}
