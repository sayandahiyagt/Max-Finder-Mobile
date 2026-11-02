import { parseMapActivity } from "@/features/search/map-contract";
import {
  dummyMapActivity,
  dummyReport,
  dummySpotting,
} from "./fixtures/dummy-data";

describe("parseMapActivity", () => {
  it("parses lost reports and spottings into map pins", () => {
    expect(parseMapActivity(dummyMapActivity)).toEqual([
      {
        id: dummyReport.reportId,
        type: "lost",
        name: "Mochi",
        species: "Cat",
        breed: "Domestic Shorthair",
        locationLabel: "Example Park, Example City",
        imageUrl: "https://images.example/mochi.webp",
        timestamp: "2026-10-20T18:30:00.000Z",
        position: [40.7128, -74.006],
      },
      {
        id: dummySpotting.id,
        type: "spotted",
        name: "",
        species: "Cat",
        breed: "Domestic Shorthair",
        locationLabel: "Example Park, Example City",
        imageUrl: "https://images.example/spotting.webp",
        timestamp: "2026-10-21T19:00:00.000Z",
        position: [40.7132, -74.0056],
      },
    ]);
  });

  it("rejects invalid coordinates instead of passing them to Leaflet", () => {
    const invalidPayload = {
      ...dummyMapActivity,
      reports: [
        { ...dummyMapActivity.reports[0], position: [91, -74.006] },
      ],
    };
    expect(parseMapActivity(invalidPayload)).toBeNull();
  });

  it("rejects timestamps that cannot be formatted in the browser", () => {
    const invalidPayload = {
      ...dummyMapActivity,
      reports: [{ ...dummyMapActivity.reports[0], timestamp: "invalid" }],
    };
    expect(parseMapActivity(invalidPayload)).toBeNull();
  });

  it("rejects incomplete API responses", () => {
    expect(parseMapActivity({ reports: dummyMapActivity.reports })).toBeNull();
  });
});
