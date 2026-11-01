import { NextResponse } from "next/server";

import { getCommunityActivityCounts } from "@/features/search/application";

export async function GET() {
  try {
    const counts = await getCommunityActivityCounts();
    return NextResponse.json(counts);
  } catch {
    return NextResponse.json(
      { error: "Community statistics are temporarily unavailable." },
      { status: 503 },
    );
  }
}
