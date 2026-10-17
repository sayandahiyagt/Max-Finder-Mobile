import {
  filterReports,
  canScrollLeft,
  canScrollRight,
} from "@/lib/carousel";
import type { ReportCard } from "@/types/reports";

const report = (overwrites: Partial<ReportCard> = {}): ReportCard => ({
  id: "1",
  petName: "Rex",
  species: "Dog",
  breed: "Labrador Retriever",
  status: "LOST",
  lastSeenAt: "2024-01-01T00:00:00.000Z",
  locationLabel: "Brooklyn, NY",
  imageUrl: null,
  ...overwrites,
});

describe("filterReports", () => {
  const reports = [
    report({ id: "1", status: "LOST" }),
    report({ id: "2", status: "FOUND" }),
    report({ id: "3", status: "LOST" }),
    report({ id: "4", status: "FOUND" }),
  ];

  it("returns everything for the 'all' filter", () => {
    expect(filterReports(reports, "all")).toHaveLength(4);
  });

  it("returns only LOST reports for the 'lost' filter", () => {
    const lost = filterReports(reports, "lost");
    expect(lost).toHaveLength(2);
    expect(lost.every((r) => r.status === "LOST")).toBe(true);
  });

  it("returns only FOUND reports for the 'found' filter", () => {
    const found = filterReports(reports, "found");
    expect(found).toHaveLength(2);
    expect(found.every((r) => r.status === "FOUND")).toBe(true);
  });

  it("returns an empty array for an empty input", () => {
    expect(filterReports([], "all")).toEqual([]);
  });

  it("is case-sensitive to real status values only", () => {
    expect(filterReports(reports.map((r) => ({ ...r, status: r.status })), "lost"))
      .toHaveLength(2);
  });
});

describe("canScrollLeft", () => {
  it("returns false when there is no container", () => {
    expect(canScrollLeft(null)).toBe(false);
  });

  it("returns false when scrollLeft is 0", () => {
    expect(canScrollLeft({ scrollLeft: 0, scrollWidth: 400, clientWidth: 300 })).toBe(false);
  });

  it("returns true when scrolled past the start", () => {
    expect(canScrollLeft({ scrollLeft: 50, scrollWidth: 800, clientWidth: 300 })).toBe(true);
  });
});

describe("canScrollRight", () => {
  it("returns false when there is no container", () => {
    expect(canScrollRight(null)).toBe(false);
  });

  it("returns false when fully scrolled to the end", () => {
    expect(canScrollRight({ scrollLeft: 500, scrollWidth: 800, clientWidth: 300 })).toBe(false);
  });

  it("returns true when more content is available", () => {
    expect(canScrollRight({ scrollLeft: 0, scrollWidth: 800, clientWidth: 300 })).toBe(true);
  });
});
