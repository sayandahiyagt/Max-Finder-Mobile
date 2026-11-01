import { NextResponse } from "next/server";

import { getRecentReunions } from "@/features/reunions/application";
import { getPetImageUrls } from "@/lib/supabase/storage";

export async function GET() {
  try {
    const reunions = await getRecentReunions(getPetImageUrls);
    return NextResponse.json({ reunions });
  } catch {
    return NextResponse.json(
      { error: "Reunions are temporarily unavailable." },
      { status: 503 },
    );
  }
}
