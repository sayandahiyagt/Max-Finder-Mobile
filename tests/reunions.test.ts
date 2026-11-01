import {
  formatReunion,
  parseReunionResponse,
} from "@/features/reunions/formatting";
import type { FoundReportSummary } from "@/features/lost-pets/types";

describe("formatReunion", () => {
  const report: FoundReportSummary = {
    id: "report-1",
    petId: "pet-1",
    petName: "Buddy",
    species: "Dog",
    breed: "Golden Retriever",
    color: "Gold",
    description: "Friendly, wearing a blue collar.",
    locationLabel: "Brooklyn, NY",
    imagePath: "pets/buddy.webp",
    lastSeenAt: new Date("2026-10-01T10:00:00Z"),
    reunitedAt: new Date("2026-10-20T12:00:00Z"),
  };

  it("maps a found report to the public reunion view", () => {
    expect(formatReunion(report, "https://images.example/buddy")).toEqual({
      id: "report-1",
      petName: "Buddy",
      species: "Dog",
      breed: "Golden Retriever",
      color: "Gold",
      description: "Friendly, wearing a blue collar.",
      locationLabel: "Brooklyn, NY",
      imageUrl: "https://images.example/buddy",
      lastSeenAt: "2026-10-01T10:00:00.000Z",
      reunitedAt: "2026-10-20T12:00:00.000Z",
    });
  });

  it("keeps a reunion visible when its profile image is unavailable", () => {
    expect(formatReunion({ ...report, imagePath: null }, null)).toMatchObject({
      id: "report-1",
      imageUrl: null,
    });
  });

  it("parses a valid JSON response and rejects malformed report rows", () => {
    expect(
      parseReunionResponse({ reunions: [formatReunion(report, null)] }),
    ).toEqual([formatReunion(report, null)]);
    expect(
      parseReunionResponse({ reunions: [{ id: "report-1" }] }),
    ).toBeNull();
  });
});
