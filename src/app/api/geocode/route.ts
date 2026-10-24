import { NextRequest, NextResponse } from "next/server";
import { reverseGeocode, searchLocations } from "@/lib/geocoding";

function coordinate(value: string | null): number | null {
  if (value === null || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  const latitude = coordinate(request.nextUrl.searchParams.get("lat"));
  const longitude = coordinate(request.nextUrl.searchParams.get("lon"));

  if (latitude !== null && longitude !== null) {
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

  const results = await searchLocations(query);
  if (results === null) {
    return NextResponse.json(
      { error: "Location search is temporarily unavailable." },
      { status: 502 },
    );
  }

  return NextResponse.json(results);
}
