import {
  filterReports,
  canScrollLeft,
  canScrollRight,
  nextIndex,
  prevIndex,
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

describe("nextIndex / prevIndex", () => {
  it("moves forward within bounds", () => {
    expect(nextIndex(4, 0)).toBe(1);
    expect(nextIndex(4, 2)).toBe(3);
  });

  it("clamps at the last index", () => {
    expect(nextIndex(4, 3)).toBe(3);
    expect(nextIndex(4, 10)).toBe(3);
  });

  it("moves backward within bounds", () => {
    expect(prevIndex(4, 3)).toBe(2);
    expect(prevIndex(4, 1)).toBe(0);
  });

  it("clamps at the first index", () => {
    expect(prevIndex(4, 0)).toBe(0);
    expect(prevIndex(4, -5)).toBe(0);
  });

  it("handles empty or single-card lists", () => {
    expect(nextIndex(0, 0)).toBe(0);
    expect(prevIndex(0, 0)).toBe(0);
    expect(nextIndex(1, 0)).toBe(0);
    expect(prevIndex(1, 0)).toBe(0);
  });
});
