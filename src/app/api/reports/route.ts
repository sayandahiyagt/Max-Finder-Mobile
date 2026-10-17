import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { reverseGeocode } from "@/lib/geocoding";
import type { ReportCard } from "@/types/reports";

async function addressFor(
  label: string | null,
  latitude: number,
  longitude: number,
): Promise<string | null> {
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

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: reports, error } = await supabase
    .from("lost_pet_reports")
    .select(
      "id, pet_name, species, breed, last_seen_at, latitude, longitude, status, location_label, image_path",
    )
    .in("status", ["LOST", "FOUND"])
    .order("last_seen_at", { ascending: false })
    .limit(24);

  if (error || !reports) {
    return NextResponse.json(
      { error: "Lost and found reports are temporarily unavailable." },
      { status: 503 },
    );
  }

  const cards: ReportCard[] = await Promise.all(
    reports.map(async (report) => ({
      id: report.id,
      petName: report.pet_name,
      species: report.species,
      breed: report.breed,
      status: report.status === "FOUND" ? "FOUND" : "LOST",
      lastSeenAt: report.last_seen_at,
      locationLabel: await addressFor(
        report.location_label,
        Number(report.latitude),
        Number(report.longitude),
      ),
      imageUrl: report.image_path
        ? supabase.storage.from("lost-pet-images").getPublicUrl(report.image_path).data
            .publicUrl
        : null,
    })),
  );

  return NextResponse.json({ reports: cards });
}
