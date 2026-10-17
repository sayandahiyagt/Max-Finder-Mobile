import { NextRequest, NextResponse } from "next/server";
import { reverseGeocode } from "@/lib/geocoding";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  const latitude = Number(request.nextUrl.searchParams.get("lat"));
  const longitude = Number(request.nextUrl.searchParams.get("lon"));

  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    const label = await reverseGeocode(latitude, longitude);
    return label
      ? NextResponse.json({ label })
      : NextResponse.json({ error: "Could not determine this address." }, { status: 502 });
  }

  if (!query || query.length < 2 || query.length > 120) {
    return NextResponse.json(
      { error: "Enter a location between 2 and 120 characters." },
      { status: 400 },
    );
  }

  const response = await fetch(
    `${NOMINATIM_URL}?format=jsonv2&limit=5&q=${encodeURIComponent(query)}`,
    {
      headers: {
        Accept: "application/json",
        "User-Agent": "MaxFinder/1.0 (community pet recovery app)",
      },
      next: { revalidate: 3600 },
    },
  );

  if (!response.ok) {
    return NextResponse.json(
      { error: "Location search is temporarily unavailable." },
      { status: 502 },
    );
  }

  const results: Array<{
    lat: string;
    lon: string;
    display_name: string;
  }> = await response.json();

  return NextResponse.json(
    results.map((result) => ({
      latitude: Number(result.lat),
      longitude: Number(result.lon),
      label: result.display_name,
    })),
  );
}
