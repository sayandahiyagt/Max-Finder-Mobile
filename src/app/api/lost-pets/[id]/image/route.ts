import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: report } = await supabase
    .from("lost_pet_reports")
    .select("pet_id, status")
    .eq("id", id)
    .eq("status", "LOST")
    .single();

  if (!report) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { data: pet } = await supabase
    .from("pets")
    .select("image_path")
    .eq("id", report.pet_id)
    .single();
  if (!pet) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { data: image, error } = await supabase.storage
    .from("pet-images")
    .download(pet.image_path);
  if (error || !image) {
    return new NextResponse("Image unavailable", { status: 404 });
  }

  return new NextResponse(image, {
    headers: {
      "Cache-Control": "public, max-age=300",
      "Content-Type": image.type || "image/jpeg",
    },
  });
}
