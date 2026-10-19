import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { reverseGeocode } from "@/lib/geocoding";
import { formatReunions } from "@/lib/reunions";

export async function GET() {
  const supabase = await createSupabaseServerClient();

  const { data: reports, error } = await supabase
    .from("lost_pet_reports")
    .select(
      "id, pet_name, species, breed, last_seen_at, updated_at, location_label, image_path, latitude, longitude",
    )
    .eq("status", "FOUND")
    .order("updated_at", { ascending: false })
    .limit(12);

  if (error) {
    return NextResponse.json(
      { error: "Reunions are temporarily unavailable." },
      { status: 503 },
    );
  }

  const resolvedRows = await Promise.all(
    reports.map(async (report) => {
      const storedLabel = report.location_label?.trim() ?? "";
      const isPlaceholder =
        /^(?:your )?current location$|^selected map location$|^finding address…?$|^address unavailable$/i.test(
          storedLabel,
        );
      let locationLabel = report.location_label;
      if (isPlaceholder) {
        try {
          const reverse = await reverseGeocode(
            Number(report.latitude),
            Number(report.longitude),
          );
          locationLabel = reverse ?? "Address unavailable";
        } catch {
          locationLabel = "Address unavailable";
        }
      }
      return {
        id: report.id,
        pet_name: report.pet_name,
        species: report.species,
        breed: report.breed,
        location_label: locationLabel,
        image_path: report.image_path,
        last_seen_at: report.last_seen_at,
      };
    }),
  );

  const getImageUrl = (imagePath: string) =>
    supabase.storage.from("lost-pet-images").getPublicUrl(imagePath).data
      .publicUrl;

  return NextResponse.json({ reunions: formatReunions(resolvedRows, getImageUrl) });
}
