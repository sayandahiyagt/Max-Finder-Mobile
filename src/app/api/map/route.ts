import { NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { reverseGeocode } from "@/lib/geocoding";

function numberParam(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function addressFor(
  label: string | null,
  latitude: number,
  longitude: number,
) {
  const storedLabel = label?.trim();
  if (
    storedLabel &&
    !/^(?:your )?current location$/i.test(storedLabel) &&
    !/^selected map location$/i.test(storedLabel)
  ) {
    return storedLabel;
  }

  try {
    return (await reverseGeocode(latitude, longitude)) ?? "Address unavailable";
  } catch {
    return "Address unavailable";
  }
}

export async function GET(request: NextRequest) {
  const bounds = {
    minLat: numberParam(request.nextUrl.searchParams.get("minLat"), -90),
    maxLat: numberParam(request.nextUrl.searchParams.get("maxLat"), 90),
    minLng: numberParam(request.nextUrl.searchParams.get("minLng"), -180),
    maxLng: numberParam(request.nextUrl.searchParams.get("maxLng"), 180),
  };

  if (
    bounds.minLat < -90 || bounds.maxLat > 90 ||
    bounds.minLng < -180 || bounds.maxLng > 180 ||
    bounds.minLat >= bounds.maxLat || bounds.minLng >= bounds.maxLng
  ) {
    return NextResponse.json({ error: "Invalid map bounds." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const [reportsResult, spottingsResult] = await Promise.all([
    supabase
      .from("lost_pet_reports")
      .select("id, pet_name, species, breed, last_seen_at, latitude, longitude, status, location_label, image_path")
      .eq("status", "LOST")
      .gte("latitude", bounds.minLat)
      .lte("latitude", bounds.maxLat)
      .gte("longitude", bounds.minLng)
      .lte("longitude", bounds.maxLng),
    supabase
      .from("spottings")
      .select("id, species, breed, spotted_at, latitude, longitude, location_label, image_path")
      .gte("latitude", bounds.minLat)
      .lte("latitude", bounds.maxLat)
      .gte("longitude", bounds.minLng)
      .lte("longitude", bounds.maxLng),
  ]);

  if (reportsResult.error || spottingsResult.error) {
    return NextResponse.json(
      { error: "Map activity is temporarily unavailable." },
      { status: 503 },
    );
  }

  return NextResponse.json({
    reports: await Promise.all(reportsResult.data.map(async (report) => ({
      id: report.id,
      type: "lost" as const,
      name: report.pet_name,
      species: report.species,
      breed: report.breed,
      locationLabel: await addressFor(report.location_label, Number(report.latitude), Number(report.longitude)),
      imageUrl: report.image_path
        ? supabase.storage.from("lost-pet-images").getPublicUrl(report.image_path).data.publicUrl
        : null,
      timestamp: report.last_seen_at,
      time: new Date(report.last_seen_at).toLocaleString(),
      position: [Number(report.latitude), Number(report.longitude)] as [
        number,
        number,
      ],
    }))),
    spottings: await Promise.all(spottingsResult.data.map(async (spotting) => ({
      id: spotting.id,
      type: "spotted" as const,
      name: "",
      species: spotting.species,
      breed: spotting.breed,
      locationLabel: await addressFor(spotting.location_label, Number(spotting.latitude), Number(spotting.longitude)),
      imageUrl: spotting.image_path
        ? supabase.storage.from("spotting-images").getPublicUrl(spotting.image_path).data.publicUrl
        : null,
      timestamp: spotting.spotted_at,
      time: new Date(spotting.spotted_at).toLocaleString(),
      position: [Number(spotting.latitude), Number(spotting.longitude)] as [
        number,
        number,
      ],
    }))),
  });
}
