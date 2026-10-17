import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const [lostResult, foundResult, spottingsResult] = await Promise.all([
    supabase
      .from("lost_pet_reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "LOST"),
    supabase
      .from("lost_pet_reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "FOUND"),
    supabase.from("spottings").select("id", { count: "exact", head: true }),
  ]);

  if (lostResult.error || foundResult.error || spottingsResult.error) {
    return NextResponse.json(
      { error: "Community statistics are temporarily unavailable." },
      { status: 503 },
    );
  }

  return NextResponse.json({
    lost: lostResult.count ?? 0,
    spottings: spottingsResult.count ?? 0,
    found: foundResult.count ?? 0,
  });
}
