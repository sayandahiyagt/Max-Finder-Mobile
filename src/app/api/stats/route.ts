import { NextResponse } from "next/server";

import { getCommunityActivityCounts } from "@/features/search/application";
import { summarizeDatabaseError } from "@/lib/error-summary";

export async function GET() {
  try {
    const counts = await getCommunityActivityCounts();
    return NextResponse.json(counts);
  } catch (error) {
    console.error("Community stats query failed.", summarizeDatabaseError(error));
    return NextResponse.json(
      { error: "Community statistics are temporarily unavailable." },
      { status: 503 },
    );
  }
}
