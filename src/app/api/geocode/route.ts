import { parseCoordinates } from "@/lib/coordinates";
import { NextRequest, NextResponse } from "next/server";

import { reverseGeocode, searchLocations } from "@/lib/geocoding";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  const latitude = request.nextUrl.searchParams.get("lat");
  const longitude = request.nextUrl.searchParams.get("lon");

  if (
    request.nextUrl.searchParams.has("lat") ||
    request.nextUrl.searchParams.has("lon")
  ) {
    const coordinates = parseCoordinates(latitude, longitude);
    if (!coordinates) {
      return NextResponse.json(
        { error: "Enter valid latitude and longitude." },
        { status: 400 },
      );
    }
    const label = await reverseGeocode(
      coordinates.latitude,
      coordinates.longitude,
    );
    return label
      ? NextResponse.json({ label })
      : NextResponse.json(
          { error: "Could not determine this address." },
          { status: 502 },
        );
  }

  if (!query || query.length < 2 || query.length > 120) {
    return NextResponse.json(
      { error: "Enter a location between 2 and 120 characters." },
      { status: 400 },
    );
  }

  const results = await searchLocations(query);
  if (results === null) {
    return NextResponse.json(
      { error: "Location search is temporarily unavailable." },
      { status: 502 },
    );
  }

  return NextResponse.json(results);
}
