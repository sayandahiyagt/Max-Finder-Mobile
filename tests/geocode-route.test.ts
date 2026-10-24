import { NextRequest } from "next/server";

import { GET } from "@/app/api/geocode/route";

describe("GET /api/geocode", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("treats a q-only request as forward geocoding", async () => {
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            lat: "40.6526006",
            lon: "-73.9497211",
            display_name: "Brooklyn, Kings County, New York, United States",
          },
        ]),
        { status: 200 },
      ),
    );

    const response = await GET(
      new NextRequest("http://localhost/api/geocode?q=Brooklyn%2C%20NY"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      {
        latitude: 40.6526006,
        longitude: -73.9497211,
        label: "Brooklyn, Kings County, New York, United States",
      },
    ]);
    expect(String(fetchSpy.mock.calls[0]?.[0])).toContain("/search?");
  });
});
