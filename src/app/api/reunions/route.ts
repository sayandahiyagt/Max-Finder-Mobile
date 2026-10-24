import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  formatReunions,
  mergeReunionData,
  reunionPetIds,
} from "@/lib/reunions";

export async function GET() {
  const supabase = await createSupabaseServerClient();

  const { data: reports, error } = await supabase
    .from("lost_pet_reports")
    .select("*")
    .eq("status", "FOUND")
    .order("updated_at", { ascending: false })
    .limit(12);

  if (error) {
    return NextResponse.json(
      { error: "Reunions are temporarily unavailable." },
      { status: 503 },
    );
  }

  const reportRows: readonly unknown[] = reports;
  const petIds = reunionPetIds(reportRows);
  let petRows: readonly unknown[] = [];
  let petImageRows: readonly unknown[] = [];

  if (petIds.length > 0) {
    const petsResult = await supabase.from("pets").select("*").in("id", petIds);
    if (!petsResult.error && petsResult.data) petRows = petsResult.data;

    const imagesResult = await supabase
      .from("pet_images")
      .select("pet_id, storage_path")
      .in("pet_id", petIds);
    if (!imagesResult.error && imagesResult.data) {
      petImageRows = imagesResult.data;
    }
  }

  const resolvedRows = mergeReunionData(
    reportRows,
    petRows,
    petImageRows,
  );

  const getImageUrl = (imagePath: string) =>
    supabase.storage.from("lost-pet-images").getPublicUrl(imagePath).data
      .publicUrl;

  return NextResponse.json({ reunions: formatReunions(resolvedRows, getImageUrl) });
}
