import { NextResponse } from "next/server";

import { getOptionalUser } from "@/lib/auth";

export async function GET() {
  const user = await getOptionalUser();
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const { actor: applicationUser } = user;
  if (!applicationUser) {
    return NextResponse.json(
      { error: "Application profile not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    userId: applicationUser.userId,
    displayName: applicationUser.displayName,
    role: applicationUser.role,
  });
}
