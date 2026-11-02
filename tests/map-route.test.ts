import { NextRequest } from "next/server";

import { GET } from "@/app/api/map/route";
import { searchMapActivity } from "@/features/search/application";
import {
  getPetImageUrls,
  getPublicImageUrl,
} from "@/lib/supabase/storage";

jest.mock("server-only", () => ({}), { virtual: true });
jest.mock("@/features/search/application", () => ({
  searchMapActivity: jest.fn(),
}));
jest.mock("@/lib/supabase/storage", () => ({
  getPetImageUrls: jest.fn(async (paths: (string | null)[]) =>
    paths.map((path) => (path ? `https://images.example/${path}` : null)),
  ),
  getPublicImageUrl: jest.fn((bucket: string, path: string | null) =>
    path ? `https://images.example/${bucket}/${path}` : null,
  ),
}));

describe("GET /api/map", () => {
  afterEach(() => jest.clearAllMocks());

  it("keeps public map pins for lost reports and anonymous spottings", async () => {
    jest.mocked(getPetImageUrls).mockImplementation(async (paths) =>
      paths.map((path) => (path ? `https://images.example/${path}` : null)),
    );
    jest.mocked(getPublicImageUrl).mockImplementation((bucket, path) =>
      path ? `https://images.example/${bucket}/${path}` : null,
    );
    jest.mocked(searchMapActivity).mockResolvedValue({
      reports: [
        {
          id: "report-1",
          petName: "Mochi",
          species: "Cat",
          breed: "Domestic Shorthair",
          lastSeenAt: new Date("2026-10-20T18:30:00Z"),
          latitude: 40.7128,
          longitude: -74.006,
          locationLabel: "Example Park",
          imagePath: "dummy/mochi.webp",
        },
      ],
      spottings: [
        {
          id: "spotting-1",
          species: "Cat",
          breed: "Domestic Shorthair",
          spottedAt: new Date("2026-10-21T19:00:00Z"),
          latitude: 40.7132,
          longitude: -74.0056,
          locationLabel: "Example Park",
          imagePath: "dummy/spotting.webp",
        },
      ],
    });

    const response = await GET(
      new NextRequest(
        "http://localhost/api/map?minLat=40.7&maxLat=40.8&minLng=-74.1&maxLng=-73.9",
      ),
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload).toMatchObject({
      reports: [
        {
          id: "report-1",
          name: "Mochi",
          imageUrl: "https://images.example/dummy/mochi.webp",
        },
      ],
      spottings: [
        {
          id: "spotting-1",
          type: "spotted",
          imageUrl:
            "https://images.example/spotting-images/dummy/spotting.webp",
        },
      ],
    });
    expect(payload.reports[0].timestamp).toBe("2026-10-20T18:30:00.000Z");
    expect(getPetImageUrls).toHaveBeenCalledWith(["dummy/mochi.webp"]);
    expect(searchMapActivity).toHaveBeenCalledWith(
      {
        minLat: 40.7,
        maxLat: 40.8,
        minLng: -74.1,
        maxLng: -73.9,
      },
      {
        activityType: "all",
        species: "",
        breed: "",
        timeRangeDays: null,
        center: null,
        radiusMiles: null,
      },
    );
  });

  it("passes public map filters to Search without requiring authentication", async () => {
    jest.mocked(searchMapActivity).mockResolvedValue({
      reports: [],
      spottings: [],
    });

    const response = await GET(
      new NextRequest(
        "http://localhost/api/map?minLat=40.7&maxLat=40.8&minLng=-74.1&maxLng=-73.9&activityType=spotted&species=Cat&breed=Domestic%20Short&timeRangeDays=7&centerLatitude=40.71&centerLongitude=-74&radiusMiles=5",
      ),
    );

    expect(response.status).toBe(200);
    expect(searchMapActivity).toHaveBeenCalledWith(
      {
        minLat: 40.7,
        maxLat: 40.8,
        minLng: -74.1,
        maxLng: -73.9,
      },
      {
        activityType: "spotted",
        species: "Cat",
        breed: "Domestic Short",
        timeRangeDays: 7,
        center: { latitude: 40.71, longitude: -74 },
        radiusMiles: 5,
      },
    );
  });

  it("uses an unavailable-address fallback for legacy placeholder labels", async () => {
    jest.mocked(searchMapActivity).mockResolvedValue({
      reports: [
        {
          id: "legacy-report",
          petName: "Mochi",
          species: "Cat",
          breed: null,
          lastSeenAt: new Date("2026-10-20T18:30:00Z"),
          latitude: 40.7128,
          longitude: -74.006,
          locationLabel: "Selected map location",
          imagePath: null,
        },
      ],
      spottings: [],
    });

    const response = await GET(
      new NextRequest(
        "http://localhost/api/map?minLat=40.7&maxLat=40.8&minLng=-74.1&maxLng=-73.9",
      ),
    );

    await expect(response.json()).resolves.toMatchObject({
      reports: [{ locationLabel: "Address unavailable" }],
      spottings: [],
    });
  });

  it("returns a service error when mapping a report image fails", async () => {
    jest.mocked(searchMapActivity).mockResolvedValue({
      reports: [
        {
          id: "report-1",
          petName: "Mochi",
          species: "Cat",
          breed: null,
          lastSeenAt: new Date("2026-10-20T18:30:00Z"),
          latitude: 40.7128,
          longitude: -74.006,
          locationLabel: "Example Park",
          imagePath: "dummy/mochi.webp",
        },
      ],
      spottings: [],
    });
    jest
      .mocked(getPetImageUrls)
      .mockRejectedValueOnce(new Error("local storage unavailable"));

    const response = await GET(
      new NextRequest(
        "http://localhost/api/map?minLat=40.7&maxLat=40.8&minLng=-74.1&maxLng=-73.9",
      ),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Map activity is temporarily unavailable.",
    });
  });

  it("rejects invalid bounds before reading map data", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost/api/map?minLat=20&maxLat=10&minLng=-74&maxLng=-73",
      ),
    );

    expect(response.status).toBe(400);
    expect(searchMapActivity).not.toHaveBeenCalled();
  });

  it("rejects missing viewport bounds before reading map data", async () => {
    const response = await GET(new NextRequest("http://localhost/api/map"));

    expect(response.status).toBe(400);
    expect(searchMapActivity).not.toHaveBeenCalled();
  });

  it.each([
    "minLat=invalid",
    "maxLat=",
    "minLng=NaN",
    "maxLng=Infinity",
  ])("rejects malformed bounds before reading map data: %s", async (query) => {
    const response = await GET(
      new NextRequest(`http://localhost/api/map?${query}`),
    );

    expect(response.status).toBe(400);
    expect(searchMapActivity).not.toHaveBeenCalled();
  });

  it.each([
    "activityType=messages",
    "timeRangeDays=0",
    "timeRangeDays=banana",
    "centerLatitude=40.7&radiusMiles=5",
    "centerLatitude=40.7&centerLongitude=-74&radiusMiles=100",
  ])("rejects invalid map filters: %s", async (query) => {
    const response = await GET(
      new NextRequest(`http://localhost/api/map?${query}`),
    );

    expect(response.status).toBe(400);
    expect(searchMapActivity).not.toHaveBeenCalled();
  });
});
